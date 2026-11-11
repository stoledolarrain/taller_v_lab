import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useGroups } from '../../hooks/useGroups';
import { GroupList } from '../grupos/GroupList';
import { GroupDetail } from '../grupos/GroupDetail';
import { GroupForm } from '../grupos/GroupForm';
import { JoinGroupForm } from '../grupos/JoinGroupForm';
import { LoadingSpinner } from '../ui/LoadingSpinner';

type DashboardView =
  | { screen: 'list' }
  | { screen: 'detail'; groupId: number }
  | { screen: 'create' }
  | { screen: 'join' };

/**
 * UserDashboard — orquestador principal de vistas post-login.
 * Gestiona la navegación entre: listado, detalle, crear y unirse.
 * No hace llamadas HTTP directas: delega a hooks y componentes especializados.
 */
export const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const { groups, isLoading, error, fetchGroups, clearError } = useGroups();
  const [view, setView] = useState<DashboardView>({ screen: 'list' });

  if (!user) return null;

  if (view.screen === 'detail') {
    return (
      <GroupDetail
        groupId={view.groupId}
        onBack={() => {
          setView({ screen: 'list' });
          fetchGroups();
        }}
        onLeft={() => {
          setView({ screen: 'list' });
          fetchGroups();
        }}
      />
    );
  }

  if (view.screen === 'create') {
    return (
      <div className="dashboard-container" data-testid="create-group-screen">
        <div className="dashboard-header">
          <h2>Crear grupo de pasanaku</h2>
          <p>
            Configura los datos de tu nuevo pasanaku. Podrás editarlos mientras esté en
            borrador.
          </p>
        </div>
        <div className="dashboard-card">
          <GroupForm
            onSuccess={() => {
              setView({ screen: 'list' });
              fetchGroups();
            }}
            onCancel={() => setView({ screen: 'list' })}
          />
        </div>
      </div>
    );
  }

  if (view.screen === 'join') {
    return (
      <div className="dashboard-container" data-testid="join-group-screen">
        <div className="dashboard-card">
          <JoinGroupForm
            onSuccess={() => {
              setView({ screen: 'list' });
              fetchGroups();
            }}
            onCancel={() => setView({ screen: 'list' })}
          />
        </div>
      </div>
    );
  }

  // ─── Vista principal: listado ─────────────────────────────────────────────
  return (
    <div className="dashboard-container" data-testid="dashboard-list-screen">
      <header className="dashboard-header">
        <h2>¡Bienvenido, {user.first_name || user.username}! 👋</h2>
        <p>Gestiona tus grupos de ahorro rotativo.</p>
      </header>

      {isLoading && groups.length === 0 ? (
        <LoadingSpinner message="Cargando tus grupos..." />
      ) : (
        <GroupList
          groups={groups}
          isLoading={isLoading}
          error={error}
          onSelectGroup={(id) => setView({ screen: 'detail', groupId: id })}
          onCreateGroup={() => setView({ screen: 'create' })}
          onJoinGroup={() => setView({ screen: 'join' })}
          onDismissError={clearError}
        />
      )}
    </div>
  );
};
