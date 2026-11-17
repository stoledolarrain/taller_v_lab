import React, { useEffect, useState } from 'react';
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

const GROUP_HASH_PATTERN = /^#\/grupos\/(\d+)\/?$/;

/** Lee la vista inicial desde la URL: `#/grupos/:id` abre el detalle de ese grupo */
const viewFromHash = (): DashboardView => {
  const match = GROUP_HASH_PATTERN.exec(window.location.hash);
  return match ? { screen: 'detail', groupId: Number(match[1]) } : { screen: 'list' };
};

/**
 * UserDashboard — orquestador principal de vistas post-login.
 * Gestiona la navegación entre: listado, detalle, crear y unirse.
 * El detalle de grupo se refleja en la URL (`#/grupos/:id`), lo que permite
 * recargar la página, usar el botón "atrás" y abrir un grupo por enlace.
 * El acceso lo valida el backend: un usuario ajeno recibe 403 (PDF Sec. 10, E2E 07).
 * No hace llamadas HTTP directas: delega a hooks y componentes especializados.
 */
export const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const { groups, isLoading, error, fetchGroups, clearError } = useGroups();
  const [view, setView] = useState<DashboardView>(viewFromHash);

  // Sincronizar la vista -> URL
  const detailGroupId = view.screen === 'detail' ? view.groupId : null;
  useEffect(() => {
    if (detailGroupId !== null) {
      const hash = `#/grupos/${detailGroupId}`;
      if (window.location.hash !== hash) window.location.hash = hash;
    } else if (GROUP_HASH_PATTERN.test(window.location.hash)) {
      window.history.replaceState(
        null,
        '',
        window.location.pathname + window.location.search
      );
    }
  }, [detailGroupId]);

  // Sincronizar URL -> vista (botones atrás/adelante o enlace pegado)
  useEffect(() => {
    const handleHashChange = () => {
      const next = viewFromHash();
      setView((prev) => {
        if (next.screen === 'detail') {
          return prev.screen === 'detail' && prev.groupId === next.groupId ? prev : next;
        }
        return prev.screen === 'detail' ? next : prev;
      });
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      // Al cerrar sesión se desmonta el dashboard: no dejar el grupo abierto en la URL
      if (GROUP_HASH_PATTERN.test(window.location.hash)) {
        window.history.replaceState(
          null,
          '',
          window.location.pathname + window.location.search
        );
      }
    };
  }, []);

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
        <h2>¡Bienvenido, {user.first_name || user.username}!</h2>
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
