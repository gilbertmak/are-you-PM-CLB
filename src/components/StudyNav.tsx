import { STUDY_ROUTES, type StudyRoute } from '../lib/learningModes';

interface StudyNavProps {
  activeRoute: StudyRoute;
  onNavigate: (route: StudyRoute) => void;
}

export function StudyNav({ activeRoute, onNavigate }: StudyNavProps) {
  return (
    <nav className="study-nav" aria-label="Study sections">
      {STUDY_ROUTES.map((route) => (
        <button
          className={`study-nav-card ${activeRoute === route.path ? 'active' : ''}`}
          key={route.path}
          onClick={() => onNavigate(route.path)}
          type="button"
          aria-current={activeRoute === route.path ? 'page' : undefined}
        >
          <span>{route.label}</span>
          <small>{route.description}</small>
          <code>{route.path}</code>
        </button>
      ))}
    </nav>
  );
}
