import { useState, useEffect, useRef, useMemo, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useMatch, useLocation } from 'react-router-dom';
import { TreePine, X, LogOut, LogIn, Plus, Minus, Maximize2, Expand } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { LoginModal } from './components/auth/LoginModal';
import { ProfileEditModal } from './components/auth/ProfileEditModal';
import { Sidebar } from './components/Sidebar';
import { ToastContainer, type ToastMessage } from './components/Toast';
import { Button } from './components/ui';
import { colors, typography, spacing, radius, shadows } from './styles/tokens';
import { useBodyScrollLock } from './hooks/useBodyScrollLock';
import { TasksDashboard } from './components/tasks/TasksDashboard';
import { TaskPageContent } from './components/tasks/TaskPage';
import { QuickViewModal } from './components/tasks/QuickViewModal';
import { WorkItemRow } from './components/ui/WorkItemRow';
import { useTasks, useProfiles, useProjects, updateTask, createTask, deleteTask as deleteTaskFromSupabase, renameCategory as renameCategoryInDB, updateCategoryColor as updateCategoryColorInDB, type MedicalTask } from './lib/supabase-hooks';
import { CommandCenter } from './components/dashboard/CommandCenter';
import { BigPictureModal } from './components/dashboard/BigPicturePanel';
import { BottomNav, type MobileTab } from './components/BottomNav';
import { MobileHeader } from './components/MobileHeader';
import { MobileMyWorkView } from './components/mobile/MobileMyWorkView';
import { MobileSettingsView } from './components/mobile/MobileSettingsView';

// Mock data - Enhanced for Hospital Process Improvement
const initialTasks = [
  { 
    id: '20000000-0000-0000-0000-000000000001', 
    title: 'הגדרת יעדי הפרויקט', 
    description: 'קביעת יעדים מדידים ומטרות ברורות לשיפור תהליכי בית החולים',
    category: 'תכנון ואסטרטגיה', 
    color: '#7dd3fc', 
    owner: 'ד״ר כהן',
    priority: 'P1',
    progress: 67,
    department: 'הנהלה',
    processName: 'תכנון אסטרטגי',
    problemStatement: 'חוסר בהירות ביעדי הפרויקט ובאופן המדידה',
    goal: 'להגדיר 5 יעדים מדידים עד סוף החודש',
    kpiName: 'מספר יעדים מוגדרים ומאושרים',
    baseline: '0 יעדים',
    target: '5 יעדים',
    measurementCadence: 'שבועי',
    startDate: '2026-01-15',
    dueDate: '2026-02-28',
    stakeholders: ['מנכ״ל', 'מנהלת סיעוד', 'מנהל רפואי'],
    risksBlockers: 'עיכוב באישורים, אי הסכמה על KPIs',
    dependencies: '',
    links: 'https://docs.example.com/strategy',
    milestones: [
      { text: 'אישור מנהלת', done: true },
      { text: 'הצגה בוועדה', done: true },
      { text: 'פרסום מסמך', done: false }
    ]
  },
  { 
    id: '20000000-0000-0000-0000-000000000002', 
    title: 'מיפוי בעלי עניין', 
    description: 'זיהוי וניתוח כל בעלי העניין הרלוונטיים לפרויקט', 
    category: 'תכנון ואסטרטגיה', 
    color: '#7dd3fc', 
    owner: 'רחל לוי', 
    priority: 'P2',
    progress: 67,
    department: 'משאבי אנוש',
    processName: 'ניהול בעלי עניין',
    problemStatement: 'חסר מיפוי מקיף של כל הגורמים המעורבים',
    goal: 'ליצור מפת בעלי עניין מלאה',
    kpiName: 'אחוז בעלי עניין שזוהו וסווגו',
    baseline: '0%',
    target: '100%',
    measurementCadence: 'חודשי',
    startDate: '2026-01-20',
    dueDate: '2026-03-15',
    stakeholders: ['צוות רפואי', 'מנהלים', 'חולים'],
    risksBlockers: 'קושי בזיהוי כל הגורמים',
    dependencies: 'תלוי במשימה #1',
    links: '',
    milestones: [
      { text: 'רשימה ראשונית', done: true },
      { text: 'פגישות היכרות', done: true },
      { text: 'מפה מלאה', done: false }
    ]
  },
  { 
    id: '20000000-0000-0000-0000-000000000003', 
    title: 'הכנת תקציב מפורט', 
    description: 'הכנת תקציב כולל עבור כל שלבי הפרויקט', 
    category: 'תכנון ואסטרטגיה', 
    color: '#7dd3fc', 
    owner: 'משה אברהם', 
    priority: 'P2',
    progress: 33,
    department: 'כספים',
    processName: 'תכנון תקציבי',
    problemStatement: 'חוסר תקציב מוגדר לפרויקט',
    goal: 'תקציב מאושר ומפורט',
    kpiName: 'אחוז השלמת תקציב',
    baseline: '0%',
    target: '100%',
    measurementCadence: 'חודשי',
    startDate: '2026-02-01',
    dueDate: '2026-03-31',
    stakeholders: ['מנהל כספים', 'מנכ״ל'],
    risksBlockers: 'עיכובים באישורים, שינויים במחירים',
    dependencies: '',
    links: '',
    milestones: [
      { text: 'אומדן עלויות', done: true },
      { text: 'הצעות מחיר', done: false },
      { text: 'אישור תקציב', done: false }
    ]
  },
  { 
    id: '20000000-0000-0000-0000-000000000004', 
    title: 'פיתוח חומרי הדרכה', 
    description: 'יצירת מצגות, מדריכים וחומרי הדרכה איכותיים', 
    category: 'פיתוח תוכן', 
    color: '#86efac', 
    owner: 'שרה מזרחי', 
    priority: 'P1',
    progress: 50,
    department: 'הדרכה ופיתוח',
    processName: 'פיתוח חומרים',
    problemStatement: 'חסר בחומרי הדרכה מובנים',
    goal: 'חומרי הדרכה מלאים ומעוצבים',
    kpiName: 'מספר חומרים מוכנים',
    baseline: '0 חומרים',
    target: '10 חומרים',
    measurementCadence: 'שבועי',
    startDate: '2026-02-05',
    dueDate: '2026-04-30',
    stakeholders: ['מנהלת הדרכה', 'מומחי תוכן'],
    risksBlockers: 'תלות במומחים חיצוניים',
    dependencies: '',
    links: '',
    milestones: [
      { text: 'תוכן עניינים', done: true },
      { text: 'טיוטה ראשונה', done: true },
      { text: 'עיצוב גרפי', done: false },
      { text: 'גרסה סופית', done: false }
    ]
  },
  { 
    id: '20000000-0000-0000-0000-000000000005', 
    title: 'בניית תוכנית לימודים', 
    description: 'פיתוח תוכנית לימודים מובנית ומותאמת', 
    category: 'פיתוח תוכן', 
    color: '#86efac', 
    owner: 'דוד שלום', 
    priority: 'P2',
    progress: 67,
    department: 'הדרכה ופיתוח',
    processName: 'תכנון לימודי',
    problemStatement: '',
    goal: 'תוכנית לימודים מאושרת',
    kpiName: '',
    baseline: '',
    target: '',
    measurementCadence: '',
    startDate: '2026-02-10',
    dueDate: '2026-05-15',
    stakeholders: [],
    risksBlockers: '',
    dependencies: 'תלוי במשימה #4',
    links: '',
    milestones: [
      { text: 'סקירת ספרות', done: true },
      { text: 'שיתוף מומחים', done: true },
      { text: 'טיוטה לאישור', done: false }
    ]
  },
  { 
    id: '20000000-0000-0000-0000-000000000006', 
    title: 'ארגון סדנאות הדרכה', 
    description: 'תכנון וביצוע סדנאות הדרכה לצוות', 
    category: 'הדרכה ויישום', 
    color: '#f0abfc', 
    owner: 'מיכל גולן', 
    priority: 'P1',
    progress: 0,
    department: 'הדרכה',
    processName: 'ביצוע הדרכות',
    problemStatement: '',
    goal: '',
    kpiName: '',
    baseline: '',
    target: '',
    measurementCadence: '',
    startDate: '',
    dueDate: '',
    stakeholders: [],
    risksBlockers: '',
    dependencies: '',
    links: '',
    milestones: [
      { text: 'הזמנת מרצים', done: false },
      { text: 'הזמנת חדרים', done: false },
      { text: 'רישום משתתפים', done: false }
    ]
  },
  { 
    id: '20000000-0000-0000-0000-000000000007', 
    title: 'ליווי צמוד של משתתפים', 
    description: 'מעקב אחר התקדמות וליווי אישי', 
    category: 'הדרכה ויישום', 
    color: '#f0abfc', 
    owner: 'יוסי ברק', 
    priority: 'P3',
    progress: 0,
    department: 'הדרכה',
    processName: 'ליווי משתתפים',
    problemStatement: '',
    goal: '',
    kpiName: '',
    baseline: '',
    target: '',
    measurementCadence: '',
    startDate: '',
    dueDate: '',
    stakeholders: [],
    risksBlockers: '',
    dependencies: '',
    links: '',
    milestones: [
      { text: 'לוח זמנים', done: false },
      { text: 'טפסי מעקב', done: false }
    ]
  },
  { 
    id: '20000000-0000-0000-0000-000000000008', 
    title: 'הכנת דוחות התקדמות', 
    description: 'דיווח חודשי על מצב הפרויקט', 
    category: 'מעקב והערכה', 
    color: '#fcd34d', 
    owner: 'נועה כהן', 
    priority: 'P2',
    progress: 0,
    department: 'בקרה',
    processName: 'דיווח ומעקב',
    problemStatement: '',
    goal: '',
    kpiName: '',
    baseline: '',
    target: '',
    measurementCadence: '',
    startDate: '',
    dueDate: '',
    stakeholders: [],
    risksBlockers: '',
    dependencies: '',
    links: '',
    milestones: [
      { text: 'תבנית דוח', done: false },
      { text: 'הגדרת KPIs', done: false }
    ]
  },
  { 
    id: '20000000-0000-0000-0000-000000000009', 
    title: 'סקרי שביעות רצון', 
    description: 'איסוף משוב מהמשתתפים', 
    category: 'מעקב והערכה', 
    color: '#fcd34d', 
    owner: 'אבי רוזן', 
    priority: 'P3',
    progress: 0,
    department: 'בקרה',
    processName: 'איסוף משוב',
    problemStatement: '',
    goal: '',
    kpiName: '',
    baseline: '',
    target: '',
    measurementCadence: '',
    startDate: '',
    dueDate: '',
    stakeholders: [],
    risksBlockers: '',
    dependencies: '',
    links: '',
    milestones: [
      { text: 'עיצוב שאלון', done: false },
      { text: 'אישור אתיקה', done: false }
    ]
  },
];

// Type for medical task to match TasksDashboard expectations

function App() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Detect task page route — renders TaskPageContent inside the normal layout
  const taskMatch = useMatch('/task/:taskId');

  // Scroll safety-net: clear any lingering overflow:hidden on every navigation
  // so a modal that failed to clean up after itself never freezes the page.
  useEffect(() => {
    document.body.style.overflow = '';
  }, [pathname]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [quickViewTask, setQuickViewTask] = useState<MedicalTask | null>(null);

  // ── Project workspace state ────────────────────────────────────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  // Load all profiles for assignment dropdowns (only when logged in)
  const { profiles } = useProfiles();
  const profileMap = useMemo(() => new Map(profiles.map(p => [p.id, p])), [profiles]);
  // Load projects — must be before useTasks so we can derive effectiveProjectId first
  const { projects, loading: projectsLoading } = useProjects(user?.id);

  // Derive the active project without waiting for a useEffect → setState round-trip.
  // If the user has manually picked a project, use that; otherwise fall back to the first
  // project from the DB so tasks start loading in the same render that projects arrive.
  const effectiveProjectId = user && projects.length > 0 ? projects[0].id : null;

  // Load tasks from Supabase for the effective project (null = no fetch)
  const { tasks: supabaseTasks } = useTasks(user ? effectiveProjectId : null);

  // Guest view (not logged in) → show mock data.
  // User view (logged in) → show their project's tasks from Supabase.
  const tasks = user
    ? supabaseTasks
    : (initialTasks as MedicalTask[]);
  
  const [viewMode, setViewMode] = useState<'rows' | 'tree' | 'command'>('command');
  const [mobilePage, setMobilePage] = useState<'my-work' | 'settings' | null>(null);

  // All users (including participants) land on the command center dashboard.
  // Do NOT auto-redirect to tree view on mount — landing must always be '/'.

  const [selectedTask, setSelectedTask] = useState<MedicalTask | null>(null);

  // canEdit: admin can edit any task; everyone else only edits tasks they created
  const canEdit = isAdmin || (!!selectedTask && selectedTask.createdBy === user?.id);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingTask, setEditingTask] = useState<MedicalTask | null>(null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [newMilestone, setNewMilestone] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [hoveredTaskInTree, setHoveredTaskInTree] = useState<typeof tasks[0] | null>(null);
  const [hoveredAssigneeTaskId, setHoveredAssigneeTaskId] = useState<string | null>(null);
  const [treeZoom, setTreeZoom] = useState(typeof window !== 'undefined' && window.innerWidth < 768 ? 0.5 : 1.0);
  const [treeFullscreen, setTreeFullscreen] = useState(false);
  const [showTreeZoomHint, setShowTreeZoomHint] = useState(() => {
    // Show hint only if user hasn't seen it before
    const hasSeenHint = localStorage.getItem('grow.treeZoomHintSeen');
    return !hasSeenHint;
  });
  const [showFilters, setShowFilters] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryModalQuery, setCategoryModalQuery] = useState('');
  const [activeStep, setActiveStep] = useState<number>(0);
  const [categoryModalFilter, setCategoryModalFilter] = useState<null | 'p1' | 'overdue' | 'blockers' | 'unassigned' | 'kpi'>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const treePanRef = useRef<HTMLDivElement>(null);
  const treeDrag = useRef({ active: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 });
  

  // Project name state with localStorage persistence
  const [projectName, setProjectName] = useState(() => {
    const saved = localStorage.getItem('grow.projectName');
    if (!saved || saved === 'GROW - מחזור ב מובילים שינוי' || saved === 'GROW - מובילים שינוי') return 'GROW';
    return saved;
  });
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [tempProjectName, setTempProjectName] = useState(projectName);
  
  // Save project name to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('grow.projectName', projectName);
  }, [projectName]);


const OWNERS_STORAGE_KEY = 'grow.ownersDirectory.v1';

  // Tree zoom functions
  const zoomIn = () => setTreeZoom(prev => Math.min(prev + 0.2, 2.0));
  const zoomOut = () => setTreeZoom(prev => Math.max(prev - 0.2, 0.3));
  const resetZoom = () => setTreeZoom(typeof window !== 'undefined' && window.innerWidth < 768 ? 0.5 : 1.0);

  // Reset zoom on screen resize (optional - adjust initial zoom for new screen size)
  useEffect(() => {
    const handleResize = () => {
      if (viewMode === 'tree') {
        setTreeZoom(window.innerWidth < 768 ? 0.5 : 1.0);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  // Scroll to top when switching to tree view to ensure project root is visible
  useEffect(() => {
    if (viewMode === 'tree') {
      // Small delay to ensure DOM is rendered
      setTimeout(() => {
        const mainElement = document.querySelector('main');
        if (mainElement) {
          mainElement.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [viewMode]);

  // Lock body scroll when tree view is active (prevents double scrollbar)
  useBodyScrollLock(viewMode === 'tree');

  // Keyboard shortcuts for tree zoom
  useEffect(() => {
    if (viewMode !== 'tree') return;

    const handleKeyboard = (e: KeyboardEvent) => {
      // Zoom in with + or =
      if ((e.key === '+' || e.key === '=') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        zoomIn();
      }
      // Zoom out with -
      if (e.key === '-' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        zoomOut();
      }
      // Reset with 0
      if (e.key === '0' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [viewMode]);

  // Computed values
  const categories = [...new Set(tasks.map(t => t.category))];
  const ownersInTasks = [...new Set(tasks.map(t => (t.owner || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'he'));

  const [ownersDirectory, setOwnersDirectory] = useState<string[]>(() => {
    const seedOwners = [...new Set((initialTasks as MedicalTask[]).map(t => (t.owner || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'he'));

    try {
      if (typeof window === 'undefined') return seedOwners;
      const raw = window.localStorage.getItem(OWNERS_STORAGE_KEY);
      if (!raw) return seedOwners;
      const parsed: unknown = JSON.parse(raw);
      const stored = Array.isArray(parsed)
        ? parsed
            .filter((v): v is string => typeof v === 'string')
            .map((v) => v.trim())
            .filter(Boolean)
        : [];

      return [...new Set([...seedOwners, ...stored])].sort((a, b) => a.localeCompare(b, 'he'));
    } catch {
      return seedOwners;
    }
  });

  const owners = ownersDirectory.length > 0 ? ownersDirectory : ownersInTasks;
  
  // Start with all categories collapsed
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Step configuration for the Task Drawer stepper
  const stepConfig = [
    {
      id: 'basics',
      label: 'יסודות',
      icon: '📋',
      description: 'כותרת, אחראי ודחיפות',
      isComplete: (task: MedicalTask | null) => !!(task?.title?.trim() && task?.owner?.trim()),
    },
    {
      id: 'definition',
      label: 'אפיון',
      icon: '🏥',
      description: 'מחלקה, תהליך, בעיה ומטרה',
      isComplete: (task: MedicalTask | null) => !!(task?.department?.trim() || task?.processName?.trim() || task?.problemStatement?.trim() || task?.goal?.trim()),
    },
    {
      id: 'kpi',
      label: 'מדדי הצלחה',
      icon: '📊',
      description: 'KPI, Baseline, Target',
      isComplete: (task: MedicalTask | null) => !!(task?.kpiName?.trim() && task?.baseline?.trim() && task?.target?.trim()),
    },
    {
      id: 'timeline',
      label: 'ציר זמן',
      icon: '📅',
      description: 'תאריכים ובעלי עניין',
      isComplete: (task: MedicalTask | null) => !!(task?.startDate || task?.dueDate),
    },
    {
      id: 'risks',
      label: 'סיכונים',
      icon: '⚠️',
      description: 'חסמים, תלויות וקישורים',
      isComplete: (task: MedicalTask | null) => !!(task?.risksBlockers?.trim() || task?.dependencies?.trim() || task?.links?.trim()),
    },
    {
      id: 'milestones',
      label: 'אבני דרך',
      icon: '🎯',
      description: 'מעקב והתקדמות',
      isComplete: (task: MedicalTask | null) => !!(task?.milestones && task.milestones.length > 0),
    },
  ];

  const getFirstIncompleteStep = (task: MedicalTask | null): number => {
    if (!task) return 0;
    const incompleteIndex = stepConfig.findIndex(step => !step.isComplete(task));
    return incompleteIndex >= 0 ? incompleteIndex : 0;
  };

  useEffect(() => {
    // Keep directory in sync with any owner that appears in tasks
    const fromTasks = [...new Set(tasks.map(t => (t.owner || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'he'));

    setOwnersDirectory((prev) => {
      const merged = new Set(prev);
      fromTasks.forEach((o) => merged.add(o));
      const next = Array.from(merged).sort((a, b) => a.localeCompare(b, 'he'));
      if (next.length === prev.length && next.every((v, i) => v === prev[i])) return prev;
      return next;
    });
  }, [tasks]);


  // Auto-set active step to first incomplete when opening drawer
  useEffect(() => {
    if (editingTask) {
      setActiveStep(getFirstIncompleteStep(editingTask));
    }
  }, [editingTask?.id]); // Only trigger on task change, not every edit

  // Keyboard navigation for drawer stepper
  useEffect(() => {
    if (!editingTask) return;

    const handleDrawerKeyboard = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveTask();
        return;
      }

      // Escape to close
      if (e.key === 'Escape') {
        setSelectedTask(null);
        setEditingTask(null);
        return;
      }

      // Arrow keys for step navigation (only when not in an input)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowLeft' && activeStep < stepConfig.length - 1) {
        setActiveStep(activeStep + 1);
      } else if (e.key === 'ArrowRight' && activeStep > 0) {
        setActiveStep(activeStep - 1);
      }
    };

    window.addEventListener('keydown', handleDrawerKeyboard);
    return () => window.removeEventListener('keydown', handleDrawerKeyboard);
  }, [editingTask, activeStep, stepConfig.length]);

  useEffect(() => {
    // Persist owner directory for "add/edit owners" without tasks
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(OWNERS_STORAGE_KEY, JSON.stringify(ownersDirectory));
    } catch {
      // ignore
    }
  }, [ownersDirectory]);

  const normalizeOwnerName = (name: string) => name.replace(/\s+/g, ' ').trim();

  const addOwner = (name: string) => {
    const normalized = normalizeOwnerName(name);
    if (!normalized) return;
    setOwnersDirectory((prev) => {
      if (prev.includes(normalized)) {
        showToast('האחראי כבר קיים', 'info');
        return prev;
      }
      const next = [...prev, normalized].sort((a, b) => a.localeCompare(b, 'he'));
      showToast('אחראי נוסף', 'success');
      return next;
    });
  };

  const renameOwner = (oldName: string, newName: string) => {
    const from = normalizeOwnerName(oldName);
    const to = normalizeOwnerName(newName);
    if (!from || !to || from === to) return;

    setOwnersDirectory((prev) => {
      if (prev.includes(to)) {
        showToast('שם אחראי כבר קיים', 'error');
        return prev;
      }
      const next = prev.map((o) => (o === from ? to : o)).sort((a, b) => a.localeCompare(b, 'he'));
      showToast('שם האחראי עודכן', 'success');
      return next;
    });

    // Update tasks in Supabase
    const tasksToUpdate = tasks.filter(t => normalizeOwnerName(t.owner) === from);
    if (effectiveProjectId) {
      Promise.all(tasksToUpdate.map(task => updateTask({ ...task, owner: to }, effectiveProjectId)))
        .catch(error => {
          console.error('Error updating owner in tasks:', error);
          showToast('שגיאה בעדכון האחראי במשימות', 'error');
        });
    }
    
    setSelectedTask((prev) => (prev && normalizeOwnerName(prev.owner) === from ? { ...prev, owner: to } : prev));
    setEditingTask((prev) => (prev && normalizeOwnerName(prev.owner) === from ? { ...prev, owner: to } : prev));
    setSelectedOwners((prev) => prev.map((o) => (normalizeOwnerName(o) === from ? to : o)));
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Allow ESC to close modals even when in input
        if (e.key === 'Escape') {
          if (isCategoryModalOpen) {
            setIsCategoryModalOpen(false);
            setSelectedCategory(null);
            setCategoryModalQuery('');
            setCategoryModalFilter(null);
            e.preventDefault();
          } else if (showNewTaskModal) {
            setShowNewTaskModal(false);
            e.preventDefault();
          } else if (editingTask) {
            setSelectedTask(null);
            setEditingTask(null);
            e.preventDefault();
          }
        }
        return;
      }

      // N - New Task (only when authenticated)
      if ((e.key === 'n' || e.key === 'N') && user) {
        setShowNewTaskModal(true);
        e.preventDefault();
      }

      // / - Focus Search
      if (e.key === '/') {
        searchInputRef.current?.focus();
        e.preventDefault();
      }

      // ESC - Close modals/drawer
      if (e.key === 'Escape') {
        if (isCategoryModalOpen) {
          setIsCategoryModalOpen(false);
          setSelectedCategory(null);
          setCategoryModalQuery('');
          setCategoryModalFilter(null);
        } else if (showNewTaskModal) {
          setShowNewTaskModal(false);
        } else if (editingTask) {
          setSelectedTask(null);
          setEditingTask(null);
        } else if (showKeyboardShortcuts) {
          setShowKeyboardShortcuts(false);
        } else if (treeFullscreen) {
          setTreeFullscreen(false);
          setViewMode('command');
        }
        e.preventDefault();
      }

      // 1-3 - Switch views
      if (e.key === '1') {
        setViewMode('command'); setTreeFullscreen(false);
        e.preventDefault();
      }
      if (e.key === '2') {
        setViewMode('rows'); setTreeFullscreen(false);
        e.preventDefault();
      }
      if (e.key === '3') {
        setViewMode('tree'); setTreeFullscreen(true);
        e.preventDefault();
      }

      // ? - Show keyboard shortcuts
      if (e.key === '?' && e.shiftKey) {
        setShowKeyboardShortcuts(true);
        e.preventDefault();
      }

      // E - Export
      if (e.key === 'e' || e.key === 'E') {
        if (e.ctrlKey || e.metaKey) {
          exportData();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isCategoryModalOpen, showNewTaskModal, editingTask, showKeyboardShortcuts, treeFullscreen]);

  // treeFullscreen is now set synchronously alongside setViewMode — no useEffect needed.

  const filteredTasks = tasks.filter(task => {
    // Search filter
    const matchesSearch = task.title.includes(searchQuery) ||
      task.description.includes(searchQuery) ||
      task.owner.includes(searchQuery);
    
    // Category filter
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(task.category);
    
    // Owner filter
    const matchesOwner = selectedOwners.length === 0 || selectedOwners.includes(task.owner);
    
    return matchesSearch && matchesCategory && matchesOwner;
  });

  const showToast = (message: string, type: ToastMessage['type'] = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };


  const closeCategoryModal = () => {
    setIsCategoryModalOpen(false);
    setSelectedCategory(null);
    setCategoryModalQuery('');
    setCategoryModalFilter(null);
  };

  const handleSaveTask = async () => {
    if (editingTask && effectiveProjectId) {
      try {
        await updateTask(editingTask, effectiveProjectId);
        setSelectedTask(editingTask);
        setEditingTask(null);
        showToast('השינויים נשמרו בהצלחה!', 'success');
      } catch (error) {
        console.error('Error saving task:', error);
        showToast('שגיאה בשמירת המשימה', 'error');
      }
    }
  };

  const toggleMilestone = (milestoneIndex: number) => {
    if (editingTask) {
      const newMilestones = [...editingTask.milestones];
      newMilestones[milestoneIndex].done = !newMilestones[milestoneIndex].done;
      const doneCount = newMilestones.filter(m => m.done).length;
      const newProgress = Math.round((doneCount / newMilestones.length) * 100);
      setEditingTask({ ...editingTask, milestones: newMilestones, progress: newProgress });
    }
  };

  const addMilestone = () => {
    if (editingTask && newMilestone.trim()) {
      const newMilestones = [...editingTask.milestones, { text: newMilestone.trim(), done: false }];
      const doneCount = newMilestones.filter(m => m.done).length;
      const newProgress = Math.round((doneCount / newMilestones.length) * 100);
      setEditingTask({ ...editingTask, milestones: newMilestones, progress: newProgress });
      setNewMilestone('');
    }
  };

  const deleteMilestone = (milestoneIndex: number) => {
    if (editingTask && editingTask.milestones.length > 1) {
      const newMilestones = editingTask.milestones.filter((_, i) => i !== milestoneIndex);
      const doneCount = newMilestones.filter(m => m.done).length;
      const newProgress = Math.round((doneCount / newMilestones.length) * 100);
      setEditingTask({ ...editingTask, milestones: newMilestones, progress: newProgress });
      showToast('המיילסטון נמחק', 'info');
    } else {
      showToast('חייבת להיות לפחות מיילסטון אחד', 'warning');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (confirm('האם אתה בטוח שברצונך למחוק משימה זו?')) {
      try {
        // Delete from Supabase
        await deleteTaskFromSupabase(taskId);
        // The real-time subscription will update the UI automatically
        setSelectedTask(null);
        setEditingTask(null);
        showToast('המשימה נמחקה בהצלחה', 'success');
      } catch (error) {
        console.error('Error deleting task:', error);
        showToast('שגיאה במחיקת המשימה', 'error');
      }
    }
  };

  const addNewTask = async (newTask: typeof tasks[0]) => {
    if (!effectiveProjectId) return;
    try {
      await createTask(newTask, effectiveProjectId, user?.id);
      setShowNewTaskModal(false);
      showToast('המשימה נוספה בהצלחה!', 'success');
    } catch (error) {
      console.error('Error creating task:', error);
      showToast('שגיאה בהוספת המשימה', 'error');
    }
  };

  const exportData = () => {
    const data = JSON.stringify(tasks, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'GROW-tasks-export.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('הנתונים יוצאו בהצלחה!', 'success');
  };

  const toggleCategoryFilter = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const toggleOwnerFilter = (owner: string) => {
    setSelectedOwners(prev =>
      prev.includes(owner) ? prev.filter(o => o !== owner) : [...prev, owner]
    );
  };

  const toggleTaskExpand = (taskId: string) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const updateCategoryColor = async (categoryName: string, newColor: string) => {
    if (!effectiveProjectId) return;
    try {
      await updateCategoryColorInDB(categoryName, newColor, effectiveProjectId);
      showToast('צבע הקטגוריה עודכן', 'success');
    } catch (error) {
      console.error('Error updating category color:', error);
      showToast('שגיאה בעדכון צבע הקטגוריה', 'error');
    }
  };

  const renameCategory = async (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName || !effectiveProjectId) return;
    if (categories.includes(newName)) {
      showToast('שם קטגוריה כבר קיים', 'error');
      return;
    }
    try {
      await renameCategoryInDB(oldName, newName, effectiveProjectId);
      setExpandedCategories(prev => prev.map(c => c === oldName ? newName : c));
      setEditingCategory(null);
      showToast('שם הקטגוריה עודכן', 'success');
    } catch (error) {
      console.error('Error renaming category:', error);
      showToast('שגיאה בשינוי שם הקטגוריה', 'error');
    }
  };

  const deleteCategory = async (category: string) => {
    if (!confirm(`האם למחוק את הקטגוריה "${category}" ואת כל המשימות בה?`)) return;
    try {
      // Delete all tasks in this category
      const tasksToDelete = tasks.filter(t => t.category === category);
      await Promise.all(tasksToDelete.map(task => deleteTaskFromSupabase(task.id)));
      setExpandedCategories(prev => prev.filter(c => c !== category));
      showToast('הקטגוריה נמחקה', 'success');
    } catch (error) {
      console.error('Error deleting category:', error);
      showToast('שגיאה במחיקת הקטגוריה', 'error');
    }
  };

  const addCategory = async (name: string, color: string) => {
    if (!name.trim() || !effectiveProjectId) return;
    if (categories.includes(name)) {
      showToast('שם קטגוריה כבר קיים', 'error');
      return;
    }
    try {
      const newTask: Omit<MedicalTask, 'id'> = {
        title: 'משימה ראשונה ב-' + name,
        description: 'תיאור המשימה',
        category: name,
        color: color,
        owner: 'ללא אחראי',
        assignedTo: null,
        participants: [],
        priority: 'P2' as const,
        progress: 0,
        department: '',
        processName: '',
        problemStatement: '',
        goal: '',
        kpiName: '',
        baseline: '',
        target: '',
        measurementCadence: '',
        startDate: '',
        dueDate: '',
        stakeholders: [],
        risksBlockers: '',
        dependencies: '',
        links: '',
        milestones: [{ text: 'שלב ראשון', done: false }],
        status: 'open',
        currentState: '',
        createdBy: null,
      };
      await createTask(newTask, effectiveProjectId);
      setExpandedCategories([...expandedCategories, name]);
      setShowAddCategory(false);
      showToast('קטגוריה חדשה נוספה', 'success');
    } catch (error) {
      console.error('Error adding category:', error);
      showToast('שגיאה בהוספת קטגוריה', 'error');
    }
  };

  // Helper functions for dashboard metrics
  const isOverdue = (task: MedicalTask) => {
    if (!task.dueDate) return false;
    return new Date(task.dueDate) < new Date();
  };

  const hasBlocker = (task: MedicalTask) => {
    return !!(task.risksBlockers && task.risksBlockers.trim());
  };

  const isUnassigned = (task: typeof tasks[0]) => {
    return !task.owner || task.owner === 'ללא אחראי' || task.owner.trim() === '';
  };

  // Priority badge component
  const getPriorityBadge = (priority: string, size: 'small' | 'medium' = 'small') => {
    const config = {
      P1: { text: 'P1', bg: '#fee2e2', color: '#dc2626', label: 'דחוף' },
      P2: { text: 'P2', bg: '#fed7aa', color: '#ea580c', label: 'בינוני' },
      P3: { text: 'P3', bg: '#e0e7ff', color: '#4f46e5', label: 'נמוך' }
    };
    const p = config[priority as keyof typeof config] || config.P2;
    const isSmall = size === 'small';
    
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? '4px' : '6px',
        padding: isSmall ? '4px 8px' : '6px 12px',
        background: p.bg,
        color: p.color,
        borderRadius: '6px',
        fontSize: isSmall ? '11px' : '13px',
        fontWeight: '700'
      }}>
        {p.text}
      </span>
    );
  };

  // Sort by urgency: Priority → Overdue → Blocker → Progress
  const sortByUrgency = (a: typeof tasks[0], b: typeof tasks[0]) => {
    // 1. Priority first
    const priorityOrder = { P1: 1, P2: 2, P3: 3 };
    const aPriority = priorityOrder[(a.priority || 'P2') as keyof typeof priorityOrder] || 2;
    const bPriority = priorityOrder[(b.priority || 'P2') as keyof typeof priorityOrder] || 2;
    if (aPriority !== bPriority) return aPriority - bPriority;

    // 2. Overdue second (overdue tasks first)
    const aOverdue = isOverdue(a) ? 1 : 0;
    const bOverdue = isOverdue(b) ? 1 : 0;
    if (aOverdue !== bOverdue) return bOverdue - aOverdue;

    // 3. Blockers third (tasks with blockers first)
    const aBlocker = hasBlocker(a) ? 1 : 0;
    const bBlocker = hasBlocker(b) ? 1 : 0;
    if (aBlocker !== bBlocker) return bBlocker - aBlocker;

    // 4. Progress last (lower progress first)
    return a.progress - b.progress;
  };

  // Tree Diagram Component (used in both Dashboard and Tree views)
  const renderTreeDiagram = (variant: 'dashboard' | 'full' | 'fullscreen') => {
    const isDashboard = variant === 'dashboard';
    const isFullscreen = variant === 'fullscreen';
    
    return (
      <div
        ref={treePanRef}
        className="tree-pan-container"
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('button,input,a,[role="button"]')) return;
          const el = treePanRef.current;
          if (!el) return;
          treeDrag.current = { active: true, startX: e.clientX, startY: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop };
          el.style.cursor = 'grabbing';
          e.preventDefault();
        }}
        onMouseMove={(e) => {
          const d = treeDrag.current;
          if (!d.active) return;
          const el = treePanRef.current;
          if (!el) return;
          el.scrollLeft = d.scrollLeft - (e.clientX - d.startX);
          el.scrollTop  = d.scrollTop  - (e.clientY - d.startY);
        }}
        onMouseUp={() => {
          treeDrag.current.active = false;
          if (treePanRef.current) treePanRef.current.style.cursor = 'grab';
        }}
        onMouseLeave={() => {
          treeDrag.current.active = false;
          if (treePanRef.current) treePanRef.current.style.cursor = 'grab';
        }}
        style={{
          padding: isDashboard ? '0' : window.innerWidth < 768 ? '24px 4px' : '48px 32px',
          overflow: 'auto',
          position: 'relative',
          cursor: 'grab',
          height: isDashboard ? '100%' : isFullscreen ? '100%' : 'calc(100dvh - 110px)',
          width: '100%',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x pan-y',
          MozUserSelect: 'none',
          WebkitUserSelect: 'none',
          msUserSelect: 'none',
          userSelect: 'none',
          display: 'flex',
          justifyContent: 'center',
          scrollbarWidth: 'thin' as const,
          scrollbarColor: '#cbd5e1 transparent',
        }}>
        <div style={{
          transform: `scale(${treeZoom})`,
          transformOrigin: 'top center',
          transition: 'transform 0.3s ease',
          width: `${100 / treeZoom}%`,
          minWidth: 'max-content',
          minHeight: 'fit-content',
          display: 'inline-block',
          paddingBottom: '100px'
        }}>
        
        {/* Project Root */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          {isEditingProjectName ? (
            <input
              type="text"
              value={tempProjectName}
              onChange={(e) => setTempProjectName(e.target.value)}
              onBlur={() => {
                if (tempProjectName.trim()) {
                  setProjectName(tempProjectName.trim());
                  setIsEditingProjectName(false);
                } else {
                  setTempProjectName(projectName);
                  setIsEditingProjectName(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (tempProjectName.trim()) {
                    setProjectName(tempProjectName.trim());
                    setIsEditingProjectName(false);
                  }
                } else if (e.key === 'Escape') {
                  setTempProjectName(projectName);
                  setIsEditingProjectName(false);
                }
              }}
              autoFocus
              style={{
                padding: '6px 20px',
                background: 'rgba(255, 255, 255, 0.95)',
                color: colors.text.primary,
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 600,
                fontFamily: typography.fontFamily,
                boxShadow: shadows.sm,
                border: `2px solid ${colors.brand.primary}`,
                letterSpacing: '-0.3px',
                textAlign: 'center',
                outline: 'none',
                width: '200px'
              }}
            />
          ) : (
            <div
              onClick={() => {
                setTempProjectName(projectName);
                setIsEditingProjectName(true);
              }}
              style={{
                padding: '10px 28px',
                background: '#ffffff',
                color: colors.text.primary,
                borderRadius: '10px',
                fontSize: '20px',
                fontWeight: 600,
                fontFamily: typography.fontFamily,
                boxShadow: '0 0 0 1px #e0e7ff, 0 4px 16px rgba(79,70,229,0.12)',
                border: `1px solid #c7d2fe`,
                letterSpacing: '-0.4px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
                width: '240px',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 1px #a5b4fc, 0 8px 24px rgba(79,70,229,0.20)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 0 0 1px #e0e7ff, 0 4px 16px rgba(79,70,229,0.12)';
              }}
              title="לחץ לעריכת שם הפרויקט"
            >
              {projectName}
            </div>
          )}

          {/* SVG Bezier Connectors: root → categories */}
          {(() => {
            const N = categories.length;
            if (N === 0) return null;
            const svgH = 48;
            return (
              <svg
                width="100%"
                height={svgH}
                viewBox={`0 0 100 ${svgH}`}
                preserveAspectRatio="none"
                style={{ display: 'block', overflow: 'visible' }}
              >
                {categories.map((_cat, i) => {
                  const catX = ((i + 0.5) / N) * 100;
                  const cp1x = 50;
                  const cp1y = svgH * 0.55;
                  const cp2x = catX;
                  const cp2y = svgH * 0.45;
                  return (
                    <path
                      key={i}
                      d={`M 50 0 C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${catX} ${svgH}`}
                      stroke="#cbd5e1"
                      strokeWidth="0.4"
                      fill="none"
                    />
                  );
                })}
              </svg>
            );
          })()}

          {/* Categories */}
          <div style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'nowrap',
            justifyContent: 'center',
            minWidth: 'fit-content'
          }}>
            {categories.map(category => {
              const categoryTasks = tasks.filter(t => t.category === category);
              const color = categoryTasks[0].color;
              const avgProgress = Math.round(categoryTasks.reduce((sum, t) => sum + t.progress, 0) / categoryTasks.length);

              return (
                <div key={category} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.md }}>

                  {/* Category Node */}
                  <div style={{
                    padding: '6px 10px',
                    background: color + '22',
                    border: `1px solid ${color}55`,
                    borderTop: `4px solid ${color}`,
                    borderRadius: '8px',
                    width: '160px',
                    textAlign: 'center',
                    boxShadow: shadows.sm,
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#171717', marginBottom: '2px' }}>
                      {category}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 300, color: color }}>
                      {categoryTasks.length} משימות · {avgProgress}%
                    </div>
                  </div>

                  {/* Connector: category → tasks */}
                  <div style={{ width: '1px', height: '14px', background: '#e2e8f0' }} />

                  {/* Tasks */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', position: 'relative' }}>
                    {categoryTasks.map((task, idx) => {
                      const taskStatus  = task.status || 'open';
                      const isDone      = taskStatus === 'done';
                      const isActive    = taskStatus === 'in_progress';
                      const hasProgress = task.progress > 0;

                      // Assignee profile lookup for department / tooltip
                      const assigneeProfile = task.assignedTo ? profileMap.get(task.assignedTo) : null;
                      const assigneeDept = assigneeProfile?.department ?? null;
                      const assigneePosition = assigneeProfile?.position ?? null;

                      // Personal: ID match (primary) → live full_name match (fallback)
                      // user?.id and profile?.full_name come from outer component scope
                      const ownerNorm  = (task.owner ?? '').trim().toLowerCase();
                      const myNameNorm = (profile?.full_name ?? '').trim().toLowerCase();
                      const isPersonal = !!(
                        (user?.id && task.assignedTo === user.id) ||
                        (myNameNorm && ownerNorm && ownerNorm === myNameNorm)
                      );

                      // Top-border: none for inactive, status-driven for active
                      const accentColor = !hasProgress ? 'transparent'
                                        : isDone      ? '#22c55e'
                                        : isActive    ? color
                                        : '#94a3b8';

                      // Activity-based card styling — stronger color saturation
                      const cardBg     = !hasProgress ? '#f1f5f9' : color + '44';
                      const cardBorder = !hasProgress
                        ? '1px dashed #e2e8f0'
                        : `1px solid ${color}77`;
                      const titleColor = !hasProgress ? '#94a3b8' : '#0f172a';
                      const ownerColor = !hasProgress ? '#cbd5e1' : isDone ? '#94a3b8' : '#334155';

                      // Elevation: ONLY personal cards float
                      const cardShadow = isPersonal
                        ? '0 24px 48px rgba(245,158,11,0.25), 0 8px 20px rgba(0,0,0,0.14)'
                        : hoveredTaskInTree?.id === task.id ? shadows.md : shadows.sm;
                      const cardTranslate = isPersonal
                        ? 'translateY(-4px)'
                        : hoveredTaskInTree?.id === task.id ? 'translateY(-2px)' : 'translateY(0)';

                      return (
                      <div key={task.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: hoveredAssigneeTaskId === task.id ? 100 : 'auto' }}>
                        {idx > 0 && <div style={{ width: '1px', height: '6px', background: '#e2e8f0' }} />}

                        <div
                          onClick={() => navigate(`/task/${task.id}`)}
                          onMouseEnter={() => setHoveredTaskInTree(task)}
                          onMouseLeave={() => setHoveredTaskInTree(null)}
                          style={{
                            padding: '5px 8px 0 8px',
                            background: cardBg,
                            border: cardBorder,
                            ...(isActive ? { animation: 'treePulse 3s ease-in-out infinite' } : {}),
                            borderRadius: '8px',
                            width: '160px',
                            height: 'auto',
                            minHeight: '62px',
                            cursor: 'pointer',
                            transition: 'box-shadow 0.2s, transform 0.2s',
                            boxShadow: cardShadow,
                            transform: cardTranslate,
                            overflow: 'hidden',
                            position: 'relative',
                            zIndex: isPersonal ? 10 : hoveredTaskInTree?.id === task.id ? 20 : 1,
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-start',
                            gap: '3px',
                          }}
                        >
                          {/* Opacity overlay for inactive cards */}
                          {!hasProgress && (
                            <div style={{
                              position: 'absolute', inset: 0,
                              background: 'rgba(241,245,249,0.40)',
                              borderRadius: '8px',
                              pointerEvents: 'none',
                              zIndex: 2,
                            }} />
                          )}

                          {/* Gold corner ribbon — sits in top-right, clear of title */}
                          {isPersonal && (
                            <div style={{
                              position: 'absolute', top: 0, right: 0,
                              width: 28, height: 28,
                              overflow: 'hidden',
                              borderRadius: '0 8px 0 0',
                              pointerEvents: 'none',
                              zIndex: 4,
                            }}>
                              <div style={{
                                position: 'absolute',
                                top: 6, right: -9,
                                width: 36, height: 7,
                                background: '#f59e0b',
                                transform: 'rotate(45deg)',
                                transformOrigin: 'center',
                                boxShadow: '0 1px 3px rgba(245,158,11,0.6)',
                              }} />
                            </div>
                          )}

                          {/* Title */}
                          <div style={{
                            fontSize: '11px',
                            fontWeight: hasProgress ? 500 : 400,
                            color: titleColor,
                            lineHeight: '1.25',
                            textAlign: 'center',
                            paddingRight: isPersonal ? '10px' : 0,
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}>
                            {task.title}
                          </div>

                          {/* Progress bar + % */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <div style={{ flex: 1, background: !hasProgress ? '#e2e8f0' : color + '30', height: '1.5px', borderRadius: '1px', overflow: 'hidden' }}>
                              <div style={{
                                background: isDone ? '#22c55e' : color,
                                height: '100%',
                                width: `${task.progress}%`,
                                transition: 'width 0.4s ease'
                              }} />
                            </div>
                            <span style={{ fontSize: '8px', fontWeight: 600, color: !hasProgress ? '#94a3b8' : color, flexShrink: 0, lineHeight: 1 }}>
                              {task.progress}%
                            </span>
                          </div>

                          {/* Footer: milestones fraction + assignee */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', paddingBottom: '5px' }}>
                            <span style={{ fontSize: '9px', fontWeight: 300, color: !hasProgress ? '#cbd5e1' : color, flexShrink: 0 }}>
                              {task.milestones.filter(m => m.done).length}/{task.milestones.length}
                            </span>
                            {task.owner && task.owner !== 'ללא אחראי' && task.owner.trim() !== '' && (
                              <span
                                onMouseEnter={() => setHoveredAssigneeTaskId(task.id)}
                                onMouseLeave={() => setHoveredAssigneeTaskId(null)}
                                style={{
                                  fontSize: '9px',
                                  fontWeight: isPersonal ? 700 : hasProgress ? 500 : 300,
                                  color: isPersonal ? '#92400e' : ownerColor,
                                  maxWidth: '110px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                  cursor: 'default',
                                  position: 'relative',
                                }}>
                                👤 {task.owner}{assigneeDept ? ` | ${assigneeDept}` : ''}
                              </span>
                            )}
                          </div>

                          {/* In-progress bottom strip — 2px flush to card bottom */}
                          {isActive && (
                            <div style={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              height: '2px',
                              width: '100%',
                              background: '#f1f5f9',
                              overflow: 'hidden',
                            }}>
                              <div style={{
                                height: '100%',
                                width: `${task.progress}%`,
                                background: color,
                                borderRadius: '0 2px 2px 0',
                                transition: 'width 0.4s ease',
                              }} />
                            </div>
                          )}

                          {/* Rich Tooltip */}
                          {hoveredTaskInTree?.id === task.id && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              right: '50%',
                              transform: 'translateX(50%)',
                              marginTop: '12px',
                              minWidth: '300px',
                              maxWidth: '380px',
                              background: 'white',
                              border: '1px solid #e2e8f0',
                              borderTop: `3px solid ${accentColor}`,
                              borderRadius: '12px',
                              padding: '16px',
                              boxShadow: shadows.lg,
                              zIndex: 100,
                              animation: 'fadeInTree 0.15s ease',
                              fontSize: '13px',
                              textAlign: 'right'
                            }}>

                              <div style={{ fontSize: '14px', fontWeight: 400, color: '#0f172a', marginBottom: '8px' }}>
                                {task.title}
                              </div>

                              {task.description && (
                                <div style={{ marginBottom: '10px', color: '#64748b', lineHeight: '1.5', fontWeight: 300 }}>
                                  {task.description}
                                </div>
                              )}

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
                                {task.department && (
                                  <div>
                                    <span style={{ color: '#94a3b8', fontWeight: 300 }}>מחלקה: </span>
                                    <span style={{ fontWeight: 400, color: '#334155' }}>{task.department}</span>
                                  </div>
                                )}
                                {task.dueDate && (
                                  <div>
                                    <span style={{ color: '#94a3b8', fontWeight: 300 }}>יעד: </span>
                                    <span style={{ fontWeight: 400, color: '#f59e0b' }}>{task.dueDate}</span>
                                  </div>
                                )}
                                {task.kpiName && (
                                  <div style={{ gridColumn: '1 / -1' }}>
                                    <span style={{ color: '#94a3b8', fontWeight: 300 }}>KPI: </span>
                                    <span style={{ fontWeight: 400, color: '#0ea5e9' }}>{task.kpiName}</span>
                                  </div>
                                )}
                              </div>

                              {task.stakeholders && task.stakeholders.length > 0 && (
                                <div style={{ fontSize: '12px', fontWeight: 300, color: '#94a3b8', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                                  {task.stakeholders.join(' · ')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Assignee profile tooltip */}
                        {hoveredAssigneeTaskId === task.id && assigneeProfile && (
                          <div style={{
                            position: 'absolute',
                            bottom: '-4px',
                            left: '50%',
                            transform: 'translateX(-50%) translateY(100%)',
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '10px 14px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                            zIndex: 200,
                            minWidth: '160px',
                            textAlign: 'right',
                            pointerEvents: 'none',
                            fontSize: '12px',
                            lineHeight: '1.6',
                          }}>
                            <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                              {assigneeProfile.full_name || assigneeProfile.email}
                            </div>
                            {assigneePosition && (
                              <div style={{ color: '#64748b', fontWeight: 300 }}>
                                <span style={{ color: '#94a3b8' }}>תפקיד: </span>{assigneePosition}
                              </div>
                            )}
                            {assigneeDept && (
                              <div style={{ color: '#64748b', fontWeight: 300 }}>
                                <span style={{ color: '#94a3b8' }}>מחלקה: </span>{assigneeDept}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>
      </div>
    );
  };

  // Header button styles
  const headerButtonCommon = {
    borderRadius: '8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  } as const;

  const elevateHeaderButton = (e: any, _shadow: string) => {
    e.currentTarget.style.opacity = '0.75';
  };

  const resetHeaderButton = (e: any, _shadow: string) => {
    e.currentTarget.style.opacity = '1';
  };


  const getHeaderModeButtonStyle = (
    _mode: string,
    isActive: boolean,
    size: 'desktop' | 'mobile' = 'desktop'
  ) => {
    return {
      ...headerButtonCommon,
      padding: size === 'mobile' ? '12px 20px' : '7px 12px',
      color: isActive ? '#4f46e5' : '#475569',
      background: 'transparent',
      border: 'none',
      fontWeight: isActive ? '700' : '500',
      fontSize: size === 'mobile' ? '14px' : '13px',
      justifyContent: size === 'mobile' ? 'center' : undefined,
      borderBottom: isActive && size === 'desktop' ? '2px solid #4f46e5' : '2px solid transparent',
      borderRadius: 0,
    } as CSSProperties;
  };

  return (
    <div className="app-container" style={{
      minHeight: '100vh',
      background: colors.background.primary,
      direction: 'rtl',
      fontFamily: typography.fontFamily,
      position: 'relative',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Global Responsive Styles */}
      <style>{`
        @media (max-width: 767px) {
          .desktop-only { display: none !important; }
          .mobile-menu { display: flex !important; }
          .header-logo-img {
            height: 60px !important;
          }
        }
        @media (min-width: 768px) {
          .mobile-only { display: none !important; }
          .mobile-menu { display: none !important; }
        }
      `}</style>
      
      {/* Header */}
      <header className="hidden md:block" style={{
        borderBottom: '1px solid rgba(226,232,240,0.70)',
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        position: 'sticky',
        top: 0,
        zIndex: 30
      }}>
        <div
          style={{
            maxWidth: '1920px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            direction: 'rtl',
            position: 'relative',
            backgroundColor: 'transparent',
            width: '100%',
          }}
          className="px-6 md:px-12 xl:px-20 h-[72px]"
        >
          {/* Nav buttons — desktop, stuck to the right (flex-start in RTL) */}
          <div
            className="desktop-only"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}
          >
            {(['command', 'rows', 'tree'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => { setViewMode(mode); setTreeFullscreen(mode === 'tree'); if (taskMatch) navigate('/'); }}
                aria-pressed={!taskMatch && viewMode === mode}
                style={getHeaderModeButtonStyle(mode, !taskMatch && viewMode === mode, 'desktop')}
                title={mode === 'tree' ? 'מפת העץ (מפת הפרויקט)' : mode === 'command' ? 'עמוד הבית' : undefined}
                onMouseEnter={(e) => { elevateHeaderButton(e, ''); }}
                onMouseLeave={(e) => { resetHeaderButton(e, ''); }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {mode === 'tree' && <TreePine size={14} aria-hidden="true" />}
                  {mode === 'command' ? 'עמוד הבית' : mode === 'rows' ? 'משימות' : 'התמונה הגדולה'}
                </span>
              </button>
            ))}
          </div>


          {/* Logo — absolutely centered in the header, independent of other items */}
          <div
            className="header-logo-wrapper"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              pointerEvents: 'none',
              direction: 'rtl',
            }}
          >
            <div style={{ background: 'white', lineHeight: 0, borderRadius: '6px', pointerEvents: 'auto' }}>
              <img
                src={`${import.meta.env.BASE_URL}hillel-yaffe-logo.png?v=2`}
                alt="הלל יפה"
                style={{
                  filter: 'brightness(1) contrast(1.05)',
                  mixBlendMode: 'multiply',
                  display: 'block',
                }}
                className="header-logo-img h-[44px] md:h-[52px] lg:h-[60px] w-auto object-contain shrink-0"
              />
            </div>
            {/* Brand text: GROW · יוצרים שינוי */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              direction: 'ltr', pointerEvents: 'auto',
            }}>
              <span
                style={{
                  fontWeight: 900,
                  color: '#0a0f1e',
                  letterSpacing: '-0.5px',
                  fontFamily: typography.fontFamily,
                  whiteSpace: 'nowrap', lineHeight: 1,
                }}
                className="text-[22px] md:text-[28px] lg:text-[34px]"
              >
                GROW
              </span>
              {/* Thin vertical separator */}
              <span style={{
                width: '1.5px', background: '#d1d5db',
                borderRadius: '1px', flexShrink: 0, alignSelf: 'stretch',
              }} />
              <span
                style={{
                  fontWeight: 300,
                  color: '#4b5563',
                  letterSpacing: '0.2px',
                  fontFamily: typography.fontFamily,
                  whiteSpace: 'nowrap', lineHeight: 1,
                }}
                className="text-[13px] md:text-[16px] lg:text-[19px]"
              >
                יוצרים שינוי
              </span>
            </div>
          </div>

          {/* Left side — credits + sign-in */}
          <div
            className="desktop-only"
            style={{ marginInlineStart: 'auto', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '16px' }}
          >
            {!user && (
              <button
                onClick={() => setShowLoginModal(true)}
                title="כניסה"
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-colors"
                style={{ background: colors.brand.primary }}
              >
                <LogIn size={14} />
                <span>כניסה</span>
              </button>
            )}
          </div>

          {/* Credits — absolute, bottom-left, single line, desktop only */}
          <div
            className="hidden md:block"
            style={{
              position: 'absolute',
              bottom: '3px',
              left: '20px',
              direction: 'rtl',
              pointerEvents: 'none',
            }}
          >
            <span style={{
              fontSize: '8px', color: '#D1D5DB',
              fontFamily: 'Heebo, sans-serif',
              whiteSpace: 'nowrap', lineHeight: 1,
            }}>
              פיתוח: ד&quot;ר שי שבו &nbsp;|&nbsp; אפיון: ד&quot;ר שי שבו, ד&quot;ר ליבי מדר, ד&quot;ר אדם פולמן
            </span>
          </div>


          {/* Mobile: hamburger for non-authenticated users */}
          {!user && (
            <button
              className="mobile-only"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              style={{
                marginInlineStart: 'auto',
                padding: '10px',
                background: 'white',
                border: '2px solid #e5e5e5',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '24px',
                transition: 'all 0.2s',
                minHeight: '44px',
                minWidth: '44px',
                flexShrink: 0,
              }}
            >
              {isMobileMenuOpen ? '✕' : '☰'}
            </button>
          )}

        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            borderTop: '2px solid #e5e5e5',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            padding: '16px',
            zIndex: 20,
            animation: 'slideDown 0.3s ease-out'
          }}>
            <style>{`
              @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

              {(['command', 'rows', 'tree'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => { setViewMode(mode); setTreeFullscreen(mode === 'tree'); setIsMobileMenuOpen(false); if (taskMatch) navigate('/'); }}
                  aria-pressed={!taskMatch && viewMode === mode}
                  style={{...getHeaderModeButtonStyle(mode, !taskMatch && viewMode === mode, 'mobile'), minHeight: '44px'}}
                  title={mode === 'tree' ? 'מפת העץ (מפת הפרויקט)' : mode === 'command' ? 'עמוד הבית' : undefined}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {mode === 'tree' && <TreePine size={18} aria-hidden="true" />}
                    {mode === 'command' ? 'עמוד הבית' : mode === 'rows' ? 'משימות' : 'התמונה הגדולה'}
                  </span>
                </button>
              ))}

              {user && (
                <button
                  onClick={() => { setIsMobileMenuOpen(false); signOut(); }}
                  style={{
                    padding: '16px', minHeight: '44px',
                    background: '#fee2e2', color: '#dc2626',
                    border: '1.5px solid #fca5a5',
                    borderRadius: '12px', cursor: 'pointer',
                    fontSize: '14px', fontWeight: '700',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: '8px',
                    fontFamily: 'inherit',
                  }}
                >
                  <LogOut size={16} />
                  יציאה
                </button>
              )}

              {/* Credits — bottom of mobile menu */}
              <div style={{
                marginTop: '4px', paddingTop: '12px',
                borderTop: '1px solid #F1F5F9',
                display: 'flex', flexDirection: 'column', gap: '3px',
                direction: 'rtl',
              }}>
                <span style={{ fontSize: '10px', color: '#9CA3AF', lineHeight: 1.4, fontFamily: 'Heebo, sans-serif' }}>
                  פיתוח: ד&quot;ר שי שבו
                </span>
                <span style={{ fontSize: '10px', color: '#9CA3AF', lineHeight: 1.4, fontFamily: 'Heebo, sans-serif' }}>
                  אפיון: ד&quot;ר שי שבו, ד&quot;ר ליבי מדר, ד&quot;ר אדם פולמן
                </span>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Body: Sidebar (when logged in) + Main content */}
      {/* direction: rtl puts sidebar on the RIGHT, main content on the LEFT */}
      <div className="pt-14 md:pt-0" style={{ display: 'flex', flex: 1, overflow: 'hidden', direction: 'rtl' }}>

      {/* Sidebar — visible only when authenticated, desktop only */}
      {user && (
        <div className="hidden md:flex">
          <Sidebar
            user={user}
            profile={profile}
            isAdmin={isAdmin}
            onSignOut={signOut}
            onEditProfile={() => setShowProfileEdit(true)}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(v => !v)}
          />
        </div>
      )}

      {/* Content */}
      <main
        className={`${taskMatch ? 'task-active' : ''} pb-16 md:pb-0`}
        style={{
          width: '100%',
          maxWidth: '1920px',
          margin: '0 auto',
          padding: taskMatch ? '0' : '16px',
          backgroundColor: taskMatch ? '#f8fafc' : 'rgba(255, 255, 255, 1)',
          boxShadow: taskMatch ? 'none' : '0 8px 32px rgba(59, 130, 246, 0.12)',
          flex: 1,
          overflow: 'auto',
          direction: 'rtl',
        }}>
        <style>{`
          @media (min-width: 768px) {
            main:not(.task-active) { padding: 24px !important; }
            main:not(.task-active) > div:not(.no-main-padding) { padding: 32px !important; }
          }
          @media (max-width: 767px) {
            main:not(.task-active) { padding: 12px !important; padding-bottom: calc(56px + 12px) !important; }
            main:not(.task-active) > div:not(.no-main-padding) { padding: 16px !important; }
          }
        `}</style>

          {/* Empty state: logged in but no project selected yet (hide while projects are still loading) */}
          {user && !effectiveProjectId && !taskMatch && !projectsLoading && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              minHeight: '60vh',
              gap: '16px',
              color: colors.text.secondary,
              fontFamily: typography.fontFamily,
              textAlign: 'center',
              padding: spacing.xxl,
            }}>
              <div style={{ fontSize: '48px' }}>📂</div>
              <h2 style={{ fontSize: typography.fontSize.h2, fontWeight: typography.fontWeight.bold, color: colors.text.primary, margin: 0 }}>
                בחר פרויקט
              </h2>
              <p style={{ fontSize: typography.fontSize.base, margin: 0, maxWidth: '320px' }}>
                בחר פרויקט מהסרגל הצדדי, או צור פרויקט חדש כדי להתחיל.
              </p>
              <p className="md:hidden" style={{ fontSize: typography.fontSize.sm, color: colors.text.tertiary, margin: 0 }}>
                (הסרגל הצדדי זמין במסך גדול יותר)
              </p>
            </div>
          )}

          {/* Task page — renders TaskPageContent inside the normal layout shell */}
          {/* key={taskId} forces a full remount when navigating between tasks,
              clearing all local state (localTask, activeSection, etc.) */}
          {taskMatch && taskMatch.params.taskId && (
            <TaskPageContent
              key={taskMatch.params.taskId}
              taskId={taskMatch.params.taskId!}
            />
          )}

          {/* Command Center — shown for any authenticated user or guest, no project required */}
          {!taskMatch && viewMode === 'command' && <CommandCenter />}

          {/* Main views — shown when guest OR when a project is selected (and not on task page) */}
          {!taskMatch && (!user || effectiveProjectId) && (
          <>


          {/* Rows View - New Tasks Dashboard */}
          {viewMode === 'rows' && (
            <>
              <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 flex flex-nowrap justify-start items-center box-content pt-[15px] pb-[15px] max-w-full md:w-[600px]">
                משימות
              </h1>
              <TasksDashboard 
                tasks={tasks}
                onSelectTask={(task) => {
                  navigate(`/task/${task.id}`);
                }}
                onRenameCategory={renameCategory}
                onAddCategory={addCategory}
                onUpdateCategoryColor={updateCategoryColor}
                onRequestAddTask={user ? () => setShowNewTaskModal(true) : undefined}
                owners={owners}
                onAddOwner={addOwner}
                onRenameOwner={renameOwner}
              />
            </>
          )}

          {/* OLD Rows View code removed - now using TasksDashboard component above */}
          {false && viewMode === 'rows' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#171717', margin: 0 }}>
                    רשימת משימות
                  </h2>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setExpandedCategories(categories)}
                      style={{
                        padding: '6px 12px',
                        background: 'white',
                        border: '1px solid #e5e5e5',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#525252',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f5f5f5';
                        e.currentTarget.style.borderColor = '#0ea5e9';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = '#e5e5e5';
                      }}
                    >
                      ⬇️ פתח הכל
                    </button>
                    <button
                      onClick={() => setExpandedCategories([])}
                      style={{
                        padding: '6px 12px',
                        background: 'white',
                        border: '1px solid #e5e5e5',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#525252',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f5f5f5';
                        e.currentTarget.style.borderColor = '#0ea5e9';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white';
                        e.currentTarget.style.borderColor = '#e5e5e5';
                      }}
                    >
                      ⬆️ סגור הכל
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddCategory(true)}
                  style={{
                    padding: '10px 18px',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                  }}
                >
                  <span>קטגוריה חדשה</span>
                </button>
              </div>

              {/* Search & Filter Toggle */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="חיפוש משימות..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      paddingLeft: '50px',
                      border: '2px solid #e5e5e5',
                      borderRadius: '10px',
                      fontSize: '15px',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#0ea5e9';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#e5e5e5';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                  <kbd style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#f5f5f5',
                    border: '1px solid #d4d4d4',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#737373',
                    fontFamily: 'monospace'
                  }}>/</kbd>
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  style={{
                    padding: '14px 20px',
                    background: showFilters ? '#0ea5e9' : 'white',
                    color: showFilters ? 'white' : '#525252',
                    border: `2px solid ${showFilters ? '#0ea5e9' : '#e5e5e5'}`,
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (!showFilters) {
                      e.currentTarget.style.borderColor = '#0ea5e9';
                      e.currentTarget.style.color = '#0ea5e9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!showFilters) {
                      e.currentTarget.style.borderColor = '#e5e5e5';
                      e.currentTarget.style.color = '#525252';
                    }
                  }}
                >
                  <span>פילטרים</span>
                  {(selectedCategories.length > 0 || selectedOwners.length > 0) && (
                    <span style={{
                      background: showFilters ? 'rgba(255,255,255,0.3)' : '#ef4444',
                      color: showFilters ? 'white' : 'white',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: '700'
                    }}>
                      {selectedCategories.length + selectedOwners.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Filters - Collapsible */}
              {showFilters && (
                <div style={{ 
                  marginBottom: '24px', 
                  padding: '20px', 
                  background: '#fafafa', 
                  borderRadius: '12px', 
                  border: '1px solid #e5e5e5',
                  animation: 'expandDown 0.2s ease-out'
                }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '16px', color: '#171717' }}>
                    פילטרים
                  </h3>
                
                {/* Category Filter */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '8px', display: 'block' }}>
                    קטגוריות:
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {categories.map(category => {
                      const isSelected = selectedCategories.includes(category);
                      const color = tasks.find(t => t.category === category)?.color || '#737373';
                      return (
                        <button
                          key={category}
                          onClick={() => toggleCategoryFilter(category)}
                          style={{
                            padding: '6px 14px',
                            background: isSelected ? color : 'white',
                            color: isSelected ? 'white' : '#525252',
                            border: `1px solid ${isSelected ? color : '#e5e5e5'}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                          }}
                        >
                          {category} {isSelected && '✓'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Owner Filter */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '8px', display: 'block' }}>
                    אחראים:
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {owners.map(owner => {
                      const isSelected = selectedOwners.includes(owner);
                      return (
                        <button
                          key={owner}
                          onClick={() => toggleOwnerFilter(owner)}
                          style={{
                            padding: '6px 14px',
                            background: isSelected ? '#0ea5e9' : 'white',
                            color: isSelected ? 'white' : '#525252',
                            border: `1px solid ${isSelected ? '#0ea5e9' : '#e5e5e5'}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                          }}
                        >
                          {owner} {isSelected && '✓'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Clear Filters */}
                {(selectedCategories.length > 0 || selectedOwners.length > 0) && (
                  <button
                    onClick={() => {
                      setSelectedCategories([]);
                      setSelectedOwners([]);
                    }}
                    style={{
                      marginTop: '12px',
                      padding: '8px 16px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                  >
                    נקה פילטרים
                  </button>
                )}
                </div>
              )}

              {/* Responsive Styles for Rows */}
              <style>{`
                @media (max-width: 1024px) {
                  .task-row {
                    grid-template-columns: auto 1fr auto !important;
                  }
                  .task-row .hide-mobile {
                    display: none !important;
                  }
                }
                @media (max-width: 768px) {
                  .expanded-grid {
                    grid-template-columns: 1fr !important;
                  }
                }
              `}</style>

              {/* Task Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {categories.map(category => {
                  const categoryTasks = filteredTasks.filter(t => t.category === category);
                  if (categoryTasks.length === 0) return null;

                  return (
                    <div key={category}>
                      {/* Category Header - Clickable */}
                      <div 
                        style={{
                          background: `linear-gradient(90deg, ${categoryTasks[0].color}10, rgba(255, 255, 255, 0.6))`,
                          backdropFilter: 'blur(16px)',
                          WebkitBackdropFilter: 'blur(16px)',
                          borderRight: `3px solid ${categoryTasks[0].color}`,
                          padding: `${spacing.lg} ${spacing.xl}`,
                          marginTop: spacing.xxl,
                          marginBottom: spacing.xs,
                          position: 'sticky',
                          top: '72px',
                          zIndex: 10,
                          boxShadow: `0 4px 16px ${categoryTasks[0].color}15`,
                          cursor: 'pointer',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          borderRadius: radius.lg
                        }}
                        onMouseEnter={(e: any) => {
                          e.currentTarget.style.background = `linear-gradient(90deg, ${categoryTasks[0].color}20, rgba(255, 255, 255, 0.7))`;
                          e.currentTarget.style.transform = 'translateX(-4px)';
                          e.currentTarget.style.boxShadow = `0 8px 24px ${categoryTasks[0].color}25`;
                        }}
                        onMouseLeave={(e: any) => {
                          e.currentTarget.style.background = `linear-gradient(90deg, ${categoryTasks[0].color}10, rgba(255, 255, 255, 0.6))`;
                          e.currentTarget.style.transform = 'translateX(0)';
                          e.currentTarget.style.boxShadow = `0 4px 16px ${categoryTasks[0].color}15`;
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          {/* Right: Category Name & Info */}
                          <div 
                            onClick={() => toggleCategory(category)}
                            style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}
                          >
                            {/* Expand/Collapse Icon */}
                            <div style={{ 
                              fontSize: '20px',
                              transition: 'transform 0.3s',
                              transform: expandedCategories.includes(category) ? 'rotate(90deg)' : 'rotate(0deg)',
                              color: categoryTasks[0].color,
                              fontWeight: 'bold'
                            }}>
                              ▶
                            </div>

                            {editingCategory === category ? (
                              <input
                                type="text"
                                defaultValue={category}
                                autoFocus
                                onBlur={(e) => {
                                  renameCategory(category, e.target.value);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    renameCategory(category, e.currentTarget.value);
                                  } else if (e.key === 'Escape') {
                                    setEditingCategory(null);
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  fontSize: typography.fontSize.lg,
                                  fontWeight: typography.fontWeight.bold,
                                  color: colors.text.primary,
                                  fontFamily: typography.fontFamily,
                                  letterSpacing: '-0.3px',
                                  border: `2px solid ${categoryTasks[0].color}`,
                                  borderRadius: radius.md,
                                  padding: `${spacing.xs} ${spacing.sm}`,
                                  background: colors.surface.default
                                }}
                              />
                            ) : (
                              <span style={{ 
                                fontSize: typography.fontSize.lg, 
                                fontWeight: typography.fontWeight.bold, 
                                color: colors.text.primary,
                                fontFamily: typography.fontFamily,
                                letterSpacing: '-0.3px'
                              }}>
                                {category}
                              </span>
                            )}
                            
                            <span style={{ 
                              fontSize: typography.fontSize.md, 
                              color: colors.text.tertiary,
                              fontWeight: typography.fontWeight.medium,
                              fontFamily: typography.fontFamily,
                              background: colors.surface.default,
                              padding: `${spacing.xs} ${spacing.md}`,
                              borderRadius: radius.md,
                              boxShadow: shadows.xs
                            }}>
                              {categoryTasks.length} משימות
                            </span>
                          </div>

                          {/* Center: Progress */}
                          <span style={{ 
                            fontSize: typography.fontSize.md, 
                            fontWeight: typography.fontWeight.bold,
                            color: categoryTasks[0].color,
                            fontFamily: typography.fontFamily,
                            marginLeft: 'auto',
                            marginRight: spacing.lg
                          }}>
                            {Math.round(categoryTasks.reduce((sum, t) => sum + t.progress, 0) / categoryTasks.length)}% ממוצע
                          </span>

                          {/* Left: Action Buttons */}
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {/* Edit Name */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCategory(category);
                              }}
                              title="שנה שם"
                            >
                              ✏️
                            </Button>

                            {/* Change Color */}
                            <label
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                padding: '6px 10px',
                                background: 'white',
                                border: '1px solid #e5e5e5',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#525252',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              onMouseEnter={(e: any) => {
                                e.currentTarget.style.background = categoryTasks[0].color + '15';
                                e.currentTarget.style.borderColor = categoryTasks[0].color;
                              }}
                              onMouseLeave={(e: any) => {
                                e.currentTarget.style.background = 'white';
                                e.currentTarget.style.borderColor = '#e5e5e5';
                              }}
                              title="שנה צבע"
                            >
                              צבע
                              <input
                                type="color"
                                value={categoryTasks[0].color}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  updateCategoryColor(category, e.target.value);
                                }}
                                style={{ 
                                  width: 0, 
                                  height: 0, 
                                  opacity: 0, 
                                  position: 'absolute' 
                                }}
                              />
                            </label>

                            {/* Delete Category */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteCategory(category);
                              }}
                              style={{
                                padding: '6px 10px',
                                background: 'white',
                                border: '1px solid #e5e5e5',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#525252',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#fee2e2';
                                e.currentTarget.style.borderColor = '#ef4444';
                                e.currentTarget.style.color = '#ef4444';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'white';
                                e.currentTarget.style.borderColor = '#e5e5e5';
                                e.currentTarget.style.color = '#525252';
                              }}
                              title="מחק קטגוריה"
                            >
                              מחק
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Task Rows - Only show if category is expanded */}
                      {expandedCategories.includes(category) && categoryTasks.map(task => {
                        const isExpanded = expandedTaskId === task.id;
                        
                        return (
                          <div key={task.id} style={{ marginBottom: '1px' }}>
                            {/* Compact Row */}
                            <div
                              className="task-row"
                              onClick={() => toggleTaskExpand(task.id)}
                              style={{
                                background: 'white',
                                border: '1px solid #e5e5e5',
                                borderRight: `4px solid ${task.color}`,
                                padding: '18px 20px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'grid',
                                gridTemplateColumns: 'auto 1fr auto auto auto auto auto',
                                gap: '20px',
                                alignItems: 'center'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = task.color + '05';
                                e.currentTarget.style.borderRightWidth = '5px';
                                e.currentTarget.style.boxShadow = `0 2px 8px ${task.color}30`;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'white';
                                e.currentTarget.style.borderRightWidth = '4px';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              {/* Expand Icon */}
                              <div style={{ 
                                fontSize: '18px',
                                transition: 'transform 0.3s',
                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                color: task.color,
                                fontWeight: 'bold'
                              }}>
                                ▶
                              </div>

                              {/* Category Badge & Title */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                                <span style={{
                                  background: `linear-gradient(135deg, ${task.color}20, ${task.color}10)`,
                                  color: task.color,
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  whiteSpace: 'nowrap',
                                  border: `1px solid ${task.color}30`
                                }}>
                                  {task.category}
                                </span>
                                
                                {/* Title */}
                                <span style={{ 
                                  fontSize: '16px', 
                                  fontWeight: '700',
                                  color: '#171717',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {task.title}
                                </span>
                              </div>

                              {/* Owner */}
                              <div className="hide-mobile" style={{ 
                                fontSize: '14px',
                                color: '#525252',
                                whiteSpace: 'nowrap',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                minWidth: '140px'
                              }}>
                                <span style={{ fontWeight: '600' }}>{task.owner}</span>
                              </div>

                              {/* Priority */}
                              <div className="hide-mobile" style={{ minWidth: '80px' }}>
                                {getPriorityBadge(task.priority || 'P2', 'small')}
                              </div>

                              {/* Progress */}
                              <div className="hide-mobile" style={{ 
                                minWidth: '140px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                              }}>
                                <div style={{ 
                                  width: '80px',
                                  background: '#f5f5f5',
                                  height: '8px',
                                  borderRadius: '4px',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{
                                    background: `linear-gradient(90deg, ${task.color}, ${task.color}dd)`,
                                    height: '100%',
                                    width: `${task.progress}%`,
                                    transition: 'width 0.3s'
                                  }} />
                                </div>
                                <span style={{ 
                                  fontSize: '14px',
                                  fontWeight: '700',
                                  color: '#171717',
                                  minWidth: '40px'
                                }}>
                                  {task.progress}%
                                </span>
                              </div>

                              {/* Milestones Count */}
                              <div className="hide-mobile" style={{ 
                                fontSize: '14px',
                                color: '#525252',
                                whiteSpace: 'nowrap',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}>
                                <span>{task.milestones.filter(m => m.done).length}/{task.milestones.length}</span>
                              </div>

                              {/* Quick Actions */}
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/task/${task.id}`);
                                  }}
                                  style={{
                                    padding: '8px 16px',
                                    background: `linear-gradient(135deg, ${task.color}15, ${task.color}10)`,
                                    border: `1px solid ${task.color}30`,
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    color: task.color,
                                    transition: 'all 0.2s',
                                    whiteSpace: 'nowrap'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = task.color;
                                    e.currentTarget.style.color = 'white';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = `linear-gradient(135deg, ${task.color}15, ${task.color}10)`;
                                    e.currentTarget.style.color = task.color;
                                  }}
                                >
                                  ✏️ ערוך
                                </button>
                              </div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                              <div style={{
                                background: '#fafafa',
                                border: '1px solid #e5e5e5',
                                borderTop: 'none',
                                padding: '24px',
                                animation: 'expandDown 0.2s ease-out'
                              }}>
                                <style>{`
                                  @keyframes expandDown {
                                    from {
                                      opacity: 0;
                                      maxHeight: 0;
                                      paddingTop: 0;
                                      paddingBottom: 0;
                                    }
                                    to {
                                      opacity: 1;
                                      maxHeight: 2000px;
                                      paddingTop: 24px;
                                      paddingBottom: 24px;
                                    }
                                  }
                                `}</style>

                                {/* Description */}
                                <div style={{ marginBottom: '20px' }}>
                                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#171717', marginBottom: '10px' }}>
                                    תיאור
                                  </h4>
                                  <p style={{ fontSize: '14px', color: '#525252', lineHeight: '1.6', margin: 0 }}>
                                    {task.description || 'אין תיאור'}
                                  </p>
                                </div>

                                {/* Process Definition Grid */}
                                {(task.department || task.processName || task.problemStatement || task.goal) && (
                                  <div style={{ 
                                    marginBottom: '20px',
                                    padding: '16px',
                                    background: 'white',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e5e5'
                                  }}>
                                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#171717', marginBottom: '12px' }}>
                                      אפיון תהליך
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                                      {task.department && (
                                        <div>
                                          <span style={{ color: '#737373' }}>מחלקה: </span>
                                          <span style={{ fontWeight: '600', color: '#171717' }}>{task.department}</span>
                                        </div>
                                      )}
                                      {task.processName && (
                                        <div>
                                          <span style={{ color: '#737373' }}>תהליך: </span>
                                          <span style={{ fontWeight: '600', color: '#171717' }}>{task.processName}</span>
                                        </div>
                                      )}
                                      {task.problemStatement && (
                                        <div style={{ gridColumn: '1 / -1' }}>
                                          <span style={{ color: '#737373' }}>בעיה: </span>
                                          <span style={{ color: '#525252' }}>{task.problemStatement}</span>
                                        </div>
                                      )}
                                      {task.goal && (
                                        <div style={{ gridColumn: '1 / -1' }}>
                                          <span style={{ color: '#737373' }}>מטרה: </span>
                                          <span style={{ fontWeight: '600', color: '#0ea5e9' }}>{task.goal}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* KPI Section */}
                                {(task.kpiName || task.baseline || task.target) && (
                                  <div style={{ 
                                    marginBottom: '20px',
                                    padding: '16px',
                                    background: 'white',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e5e5'
                                  }}>
                                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#171717', marginBottom: '12px' }}>
                                      מדד הצלחה
                                    </h4>
                                    <div style={{ fontSize: '13px' }}>
                                      {task.kpiName && (
                                        <div style={{ marginBottom: '8px' }}>
                                          <span style={{ color: '#737373' }}>מדד: </span>
                                          <span style={{ fontWeight: '600', color: '#171717' }}>{task.kpiName}</span>
                                        </div>
                                      )}
                                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                        {task.baseline && (
                                          <div>
                                            <span style={{ color: '#737373' }}>Baseline: </span>
                                            <span style={{ fontWeight: '600', color: '#ef4444' }}>{task.baseline}</span>
                                          </div>
                                        )}
                                        {task.baseline && task.target && <span style={{ color: '#d4d4d4' }}>→</span>}
                                        {task.target && (
                                          <div>
                                            <span style={{ color: '#737373' }}>Target: </span>
                                            <span style={{ fontWeight: '600', color: '#22c55e' }}>{task.target}</span>
                                          </div>
                                        )}
                                        {task.measurementCadence && (
                                          <div style={{ marginRight: 'auto' }}>
                                            <span style={{ color: '#737373' }}>תדירות: </span>
                                            <span style={{ fontWeight: '600', color: '#171717' }}>{task.measurementCadence}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Dates & Stakeholders */}
                                {(task.startDate || task.dueDate || (task.stakeholders && task.stakeholders.length > 0)) && (
                                  <div style={{ 
                                    marginBottom: '20px',
                                    padding: '16px',
                                    background: 'white',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e5e5'
                                  }}>
                                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#171717', marginBottom: '12px' }}>
                                      תאריכים ובעלי עניין
                                    </h4>
                                    <div style={{ fontSize: '13px' }}>
                                      <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                                        {task.startDate && (
                                          <div>
                                            <span style={{ color: '#737373' }}>התחלה: </span>
                                            <span style={{ fontWeight: '600', color: '#171717' }}>{task.startDate}</span>
                                          </div>
                                        )}
                                        {task.dueDate && (
                                          <div>
                                            <span style={{ color: '#737373' }}>יעד: </span>
                                            <span style={{ fontWeight: '600', color: '#f59e0b' }}>{task.dueDate}</span>
                                          </div>
                                        )}
                                      </div>
                                      {task.stakeholders && task.stakeholders.length > 0 && (
                                        <div>
                                          <span style={{ color: '#737373' }}>בעלי עניין: </span>
                                          <span style={{ fontWeight: '500', color: '#525252' }}>
                                            {task.stakeholders.join(', ')}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Risks & Dependencies */}
                                {(task.risksBlockers || task.dependencies || task.links) && (
                                  <div style={{ 
                                    marginBottom: '20px',
                                    padding: '16px',
                                    background: 'white',
                                    borderRadius: '8px',
                                    border: '1px solid #e5e5e5'
                                  }}>
                                    <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#171717', marginBottom: '12px' }}>
                                      סיכונים ותלויות
                                    </h4>
                                    <div style={{ fontSize: '13px' }}>
                                      {task.risksBlockers && (
                                        <div style={{ marginBottom: '8px' }}>
                                          <span style={{ color: '#737373' }}>סיכונים: </span>
                                          <span style={{ color: '#525252' }}>{task.risksBlockers}</span>
                                        </div>
                                      )}
                                      {task.dependencies && (
                                        <div style={{ marginBottom: '8px' }}>
                                          <span style={{ color: '#737373' }}>תלויות: </span>
                                          <span style={{ color: '#525252' }}>{task.dependencies}</span>
                                        </div>
                                      )}
                                      {task.links && (
                                        <div>
                                          <span style={{ color: '#737373' }}>קישורים: </span>
                                          <a href={task.links} target="_blank" rel="noopener noreferrer" style={{ 
                                            color: '#0ea5e9',
                                            textDecoration: 'underline',
                                            wordBreak: 'break-all'
                                          }}>
                                            {task.links}
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Milestones */}
                                <div>
                                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#171717', marginBottom: '12px' }}>
                                    מיילסטונים
                                  </h4>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {task.milestones.map((m, i) => (
                                      <div key={i} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '10px 14px',
                                        background: m.done ? '#dcfce7' : 'white',
                                        borderRadius: '8px',
                                        border: '1px solid ' + (m.done ? '#bbf7d0' : '#e5e5e5')
                                      }}>
                                        <span style={{ fontSize: '18px' }}>
                                          {m.done ? '✓' : '○'}
                                        </span>
                                        <span style={{
                                          fontSize: '14px',
                                          color: m.done ? '#15803d' : '#525252',
                                          textDecoration: m.done ? 'line-through' : 'none',
                                          flex: 1,
                                          fontWeight: '500'
                                        }}>
                                          {m.text}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tree View */}
          {viewMode === 'tree' && (
            <div style={{ 
              position: 'relative',
              width: '100%'
            }}>
              {renderTreeDiagram('full')}
              
              {/* Zoom Controls — floating glass panel, bottom-right */}
              <div style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                background: 'rgba(255,255,255,0.88)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: '14px',
                border: '1px solid rgba(226,232,240,0.8)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
                padding: '6px',
                pointerEvents: 'auto',
              }}>
                {/* Zoom In */}
                {([
                  { icon: <Plus size={16} />, onClick: zoomIn, title: 'הגדל (Zoom In)', label: 'הגדל' },
                  { icon: <Minus size={16} />, onClick: zoomOut, title: 'הקטן (Zoom Out)', label: 'הקטן' },
                  { icon: <Maximize2 size={16} />, onClick: resetZoom, title: 'התאם למסך', label: 'Reset' },
                  { icon: <Expand size={16} />, onClick: () => setTreeFullscreen(true), title: 'מסך מלא', label: 'Fullscreen' },
                ] as { icon: React.ReactNode; onClick: () => void; title: string; label: string }[]).map(({ icon, onClick, title, label }, i) => (
                  <button
                    key={label}
                    onClick={onClick}
                    title={title}
                    aria-label={label}
                    style={{
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      borderRadius: '10px',
                      background: 'transparent',
                      color: '#475569',
                      cursor: 'pointer',
                      transition: 'background 0.15s, color 0.15s',
                      marginBottom: i === 1 ? '4px' : 0, // gap between zoom pair and util pair
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                      e.currentTarget.style.color = '#1e293b';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#475569';
                    }}
                  >
                    {icon}
                  </button>
                ))}

                {/* Divider */}
                <div style={{ width: '24px', height: '1px', background: '#e2e8f0', margin: '2px 0' }} />

                {/* Zoom % badge */}
                <div style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#64748b',
                  letterSpacing: '0.02em',
                  padding: '4px 0 2px',
                  lineHeight: 1,
                }}>
                  {Math.round(treeZoom * 100)}%
                </div>
              </div>

              {/* Fullscreen overlay */}
              <AnimatePresence>
              {treeFullscreen && (
                <motion.div
                  key="tree-fullscreen"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                  position: 'fixed', inset: 0, zIndex: 9000,
                  background: '#ffffff',
                  display: 'flex', flexDirection: 'column',
                }}>
                  {/* Header bar */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 20px', borderBottom: '1px solid #e2e8f0',
                    background: '#ffffff', flexShrink: 0,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 4, height: 20, background: '#4f46e5', borderRadius: 2 }} />
                      <span style={{ fontSize: '15px', fontWeight: 500, color: '#0f172a', fontFamily: 'Rubik' }}>
                        {projectName}
                      </span>
                    </div>

                    <button
                      onClick={() => { setTreeFullscreen(false); setViewMode('command'); }}
                      title="סגור מסך מלא (Esc)"
                      style={{
                        width: 36, height: 36, borderRadius: 8,
                        border: '1px solid #e2e8f0', background: 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontSize: '18px', color: '#64748b',
                        transition: 'background 0.15s, color 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'none';    e.currentTarget.style.color = '#64748b'; }}
                    >
                      ✕
                    </button>
                  </div>
                  {/* Tree canvas */}
                  <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                    {renderTreeDiagram('fullscreen')}
                    {/* Floating zoom panel — bottom-right */}
                    <div style={{
                      position: 'absolute', bottom: 20, right: 20, zIndex: 10,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                      background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(12px)',
                      borderRadius: '14px', border: '1px solid rgba(226,232,240,0.8)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 1.5px 6px rgba(0,0,0,0.06)',
                      padding: '6px',
                    }}>
                      {([
                        { icon: <Plus size={15} />,      fn: zoomIn,    title: 'הגדל' },
                        { icon: <Minus size={15} />,     fn: zoomOut,   title: 'הקטן' },
                        { icon: <Maximize2 size={14} />, fn: resetZoom, title: 'התאם למסך' },
                      ] as { icon: React.ReactNode; fn: () => void; title: string }[]).map(({ icon, fn, title }) => (
                        <button key={title} onClick={fn} title={title} style={{
                          width: 32, height: 32, border: 'none', borderRadius: 9,
                          background: 'transparent', color: '#475569',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
                        }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}
                        >{icon}</button>
                      ))}
                      <div style={{
                        fontSize: '11px', fontWeight: 600, color: '#64748b',
                        padding: '2px 0 0', minWidth: 32, textAlign: 'center', lineHeight: 1,
                      }}>
                        {Math.round(treeZoom * 100)}%
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>

              {/* Zoom Hint - shows on first view */}
              {showTreeZoomHint && (
                <div style={{
                  position: 'fixed',
                  top: '100px',
                  right: '50%',
                  transform: 'translateX(50%)',
                  maxWidth: '320px',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: 'white',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(34, 197, 94, 0.4)',
                  zIndex: 60,
                  animation: 'fadeInDown 0.5s ease-out',
                  textAlign: 'center',
                  fontFamily: typography.fontFamily,
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  <style>{`
                    @keyframes fadeInDown {
                      from {
                        opacity: 0;
                        transform: translateX(50%) translateY(-20px);
                      }
                      to {
                        opacity: 1;
                        transform: translateX(50%) translateY(0);
                      }
                    }
                  `}</style>
                  השתמש בכפתורים למטה להגדלה/הקטנה 🔍
                  <div style={{ 
                    marginTop: '8px', 
                    fontSize: '12px', 
                    fontWeight: '400',
                    opacity: 0.9
                  }}>
                    או לחץ +/- במקלדת
                  </div>
                  <button
                    onClick={() => {
                      setShowTreeZoomHint(false);
                      localStorage.setItem('grow.treeZoomHintSeen', 'true');
                    }}
                    style={{
                      marginTop: '8px',
                      padding: '6px 12px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '6px',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    הבנתי
                  </button>
                </div>
              )}
            </div>
          )}

          </> /* end main views fragment */
          )}

      </main>

      </div>{/* end body flex wrapper */}

      {/* Category Details Modal */}
      {isCategoryModalOpen && selectedCategory && (() => {
        const categoryTasks = tasks.filter((t) => t.category === selectedCategory);
        const avgProgress = categoryTasks.length > 0
          ? Math.round(categoryTasks.reduce((sum, t) => sum + t.progress, 0) / categoryTasks.length)
          : 0;
        const color = categoryTasks[0]?.color || colors.brand.primary;
        const tasksWithKPI = categoryTasks.filter(t => t.kpiName && t.kpiName.trim()).length;
        const tasksWithRisks = categoryTasks.filter(t => t.risksBlockers && t.risksBlockers.trim()).length;
        const p1Count = categoryTasks.filter(t => t.priority === 'P1').length;
        const overdueCount = categoryTasks.filter(isOverdue).length;
        const noOwnerCount = categoryTasks.filter(isUnassigned).length;

        const query = categoryModalQuery.trim();
        const visibleTasks = categoryTasks
          .filter((t) => {
            if (!query) return true;
            return (
              t.title?.includes(query) ||
              t.description?.includes(query) ||
              t.owner?.includes(query) ||
              t.processName?.includes(query)
            );
          })
          .filter((t) => {
            if (!categoryModalFilter) return true;
            switch (categoryModalFilter) {
              case 'p1':
                return t.priority === 'P1';
              case 'overdue':
                return isOverdue(t);
              case 'blockers':
                return Boolean(t.risksBlockers?.trim());
              case 'unassigned':
                return isUnassigned(t);
              case 'kpi':
                return Boolean(t.kpiName?.trim());
              default:
                return true;
            }
          })
          .slice()
          .sort(sortByUrgency);

        const getCategoryVariant = (hex: string): 'purple' | 'blue' | 'green' => {
          if ((hex || '').includes('fc')) return 'purple';
          if ((hex || '').includes('7dd')) return 'blue';
          return 'green';
        };

        return (
          <>
            <div
              onClick={closeCategoryModal}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                zIndex: 60,
              }}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`פרטים עבור קטגוריה ${selectedCategory}`}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 70,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px',
              }}
              dir="rtl"
            >
              <div
                style={{
                  width: 'min(980px, calc(100vw - 32px))',
                  maxHeight: 'min(85vh, 860px)',
                  overflow: 'hidden',
                  borderRadius: '18px',
                  border: '1px solid rgba(255,255,255,0.45)',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,250,252,0.92))',
                  boxShadow: '0 30px 90px rgba(0,0,0,0.22)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '16px 18px',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                    background: 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        aria-hidden="true"
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '999px',
                          background: color,
                          boxShadow: `0 0 0 6px ${color}22`,
                        }}
                      />
                      <h2
                        style={{
                          margin: 0,
                          fontSize: '18px',
                          fontWeight: 900,
                          color: '#0f172a',
                          fontFamily: typography.fontFamily,
                          letterSpacing: '-0.4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {selectedCategory}
                      </h2>
                    </div>
                    <div
                      style={{
                        marginTop: '6px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#64748b',
                        fontFamily: typography.fontFamily,
                      }}
                    >
                      {categoryTasks.length} משימות · {avgProgress}% התקדמות ממוצעת
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeCategoryModal}
                    aria-label="סגור"
                    style={{
                      width: '40px',
                      height: '40px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '12px',
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(255,255,255,0.65)',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Body */}
                <div
                  style={{
                    padding: '16px 18px 18px',
                    overflowY: 'auto',
                    maxHeight: 'calc(min(85vh, 860px) - 72px)',
                  }}
                >
                  {/* Summary tiles */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                      gap: '12px',
                      marginBottom: '14px',
                    }}
                  >
                    {[
                      { label: 'P1', value: p1Count, tone: p1Count > 0 ? 'danger' : 'neutral', filterKey: 'p1' as const },
                      { label: 'איחורים', value: overdueCount, tone: overdueCount > 0 ? 'warning' : 'neutral', filterKey: 'overdue' as const },
                      { label: 'חסמים', value: tasksWithRisks, tone: tasksWithRisks > 0 ? 'warning' : 'neutral', filterKey: 'blockers' as const },
                      { label: 'ללא אחראי', value: noOwnerCount, tone: noOwnerCount > 0 ? 'info' : 'neutral', filterKey: 'unassigned' as const },
                      { label: 'KPI', value: tasksWithKPI, tone: tasksWithKPI > 0 ? 'success' : 'neutral', filterKey: 'kpi' as const },
                    ].map((m) => {
                      const isActive = categoryModalFilter === m.filterKey;
                      const toneStyles =
                        m.tone === 'danger'
                          ? { border: '1px solid rgba(239, 68, 68, 0.22)', background: 'rgba(254, 226, 226, 0.35)', color: '#991b1b' }
                          : m.tone === 'warning'
                            ? { border: '1px solid rgba(245, 158, 11, 0.22)', background: 'rgba(254, 243, 199, 0.35)', color: '#92400e' }
                            : m.tone === 'success'
                              ? { border: '1px solid rgba(34, 197, 94, 0.22)', background: 'rgba(220, 252, 231, 0.30)', color: '#166534' }
                              : m.tone === 'info'
                                ? { border: '1px solid rgba(59, 130, 246, 0.22)', background: 'rgba(219, 234, 254, 0.35)', color: '#1e40af' }
                                : { border: '1px solid rgba(148, 163, 184, 0.18)', background: 'rgba(248,250,252,0.7)', color: '#334155' };

                      const activeStyles = isActive
                        ? {
                            boxShadow: `0 0 0 2px ${toneStyles.color}40, 0 4px 12px ${toneStyles.color}30`,
                            transform: 'scale(1.02)',
                            borderWidth: '2px',
                          }
                        : {};

                      return (
                        <button
                          type="button"
                          key={m.label}
                          onClick={() => {
                            setCategoryModalFilter(isActive ? null : m.filterKey);
                          }}
                          style={{
                            borderRadius: '14px',
                            padding: '12px 12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            textAlign: 'right',
                            ...toneStyles,
                            ...activeStyles,
                          }}
                          title={`לחץ לסינון לפי ${m.label}`}
                        >
                          <div style={{ fontSize: '12px', fontWeight: 800, fontFamily: typography.fontFamily }}>
                            {m.label}
                          </div>
                          <div style={{ marginTop: '6px', fontSize: '22px', fontWeight: 900, lineHeight: 1, fontFamily: typography.fontFamily }}>
                            {m.value}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Search */}
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '14px' }}>
                    <input
                      value={categoryModalQuery}
                      onChange={(e) => setCategoryModalQuery(e.target.value)}
                      placeholder="חיפוש בתוך הקטגוריה…"
                      style={{
                        flex: 1,
                        height: '40px',
                        borderRadius: '12px',
                        border: '1px solid rgba(148,163,184,0.25)',
                        padding: '0 12px',
                        fontFamily: typography.fontFamily,
                        fontWeight: 700,
                        outline: 'none',
                        background: 'rgba(255,255,255,0.75)',
                      }}
                    />
                    <div
                      style={{
                        height: '40px',
                        padding: '0 12px',
                        borderRadius: '12px',
                        border: '1px solid rgba(148,163,184,0.20)',
                        background: 'rgba(248,250,252,0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        fontFamily: typography.fontFamily,
                        fontSize: '12px',
                        fontWeight: 800,
                        color: '#64748b',
                        whiteSpace: 'nowrap',
                      }}
                      title="מיון לפי דחיפות (קבוע בשלב זה)"
                    >
                      מיון: דחיפות
                    </div>
                  </div>

                  {/* Active filter pill */}
                  {categoryModalFilter && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        marginBottom: '12px',
                        borderRadius: '10px',
                        background: 'rgba(59, 130, 246, 0.08)',
                        border: '1px solid rgba(59, 130, 246, 0.20)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#1e40af',
                          fontFamily: typography.fontFamily,
                          flex: 1,
                        }}
                      >
                        מסנן:{' '}
                        {categoryModalFilter === 'p1' && 'P1'}
                        {categoryModalFilter === 'overdue' && 'איחורים'}
                        {categoryModalFilter === 'blockers' && 'חסמים'}
                        {categoryModalFilter === 'unassigned' && 'ללא אחראי'}
                        {categoryModalFilter === 'kpi' && 'KPI'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCategoryModalFilter(null)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(59, 130, 246, 0.30)',
                          background: 'rgba(255,255,255,0.9)',
                          color: '#1e40af',
                          fontSize: '12px',
                          fontWeight: 800,
                          fontFamily: typography.fontFamily,
                          cursor: 'pointer',
                        }}
                      >
                        נקה
                      </button>
                    </div>
                  )}

                  {/* Task list */}
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {visibleTasks.map((t) => {
                      const totalMilestones = Array.isArray(t.milestones) ? t.milestones.length : 0;
                      const safeTotal = Math.max(1, totalMilestones);
                      const completedMilestones = Array.isArray(t.milestones)
                        ? t.milestones.filter((m) => m.done).length
                        : 0;
                      // Compute reason badges if filter is active
                      const reasons: string[] = [];
                      if (categoryModalFilter) {
                        if (t.priority === 'P1') reasons.push('P1');
                        if (isOverdue(t)) reasons.push('איחור');
                        if (t.risksBlockers?.trim()) reasons.push('חסם');
                        if (isUnassigned(t)) reasons.push('ללא אחראי');
                        if (t.kpiName?.trim()) reasons.push('KPI');
                      }

                      return (
                        <div key={t.id}>
                          {reasons.length > 0 && (
                            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', paddingRight: '4px' }}>
                              {reasons.map((r) => (
                                <span
                                  key={r}
                                  style={{
                                    fontSize: '10px',
                                    fontWeight: 800,
                                    fontFamily: typography.fontFamily,
                                    padding: '2px 6px',
                                    borderRadius: '6px',
                                    background:
                                      r === 'P1'
                                        ? 'rgba(239, 68, 68, 0.12)'
                                        : r === 'איחור'
                                          ? 'rgba(245, 158, 11, 0.12)'
                                          : r === 'חסם'
                                            ? 'rgba(245, 158, 11, 0.12)'
                                            : r === 'ללא אחראי'
                                              ? 'rgba(59, 130, 246, 0.12)'
                                              : 'rgba(34, 197, 94, 0.12)',
                                    color:
                                      r === 'P1'
                                        ? '#991b1b'
                                        : r === 'איחור'
                                          ? '#92400e'
                                          : r === 'חסם'
                                            ? '#92400e'
                                            : r === 'ללא אחראי'
                                              ? '#1e40af'
                                              : '#166534',
                                    border:
                                      r === 'P1'
                                        ? '1px solid rgba(239, 68, 68, 0.25)'
                                        : r === 'איחור'
                                          ? '1px solid rgba(245, 158, 11, 0.25)'
                                          : r === 'חסם'
                                            ? '1px solid rgba(245, 158, 11, 0.25)'
                                            : r === 'ללא אחראי'
                                              ? '1px solid rgba(59, 130, 246, 0.25)'
                                              : '1px solid rgba(34, 197, 94, 0.25)',
                                  }}
                                >
                                  {r}
                                </span>
                              ))}
                            </div>
                          )}
                          <WorkItemRow
                            title={t.title}
                            priority={(t.priority || 'P2') as 'P1' | 'P2' | 'P3'}
                            category={{ label: t.category, variant: getCategoryVariant(t.color) }}
                            accentColor={t.color}
                            owner={t.owner}
                            progress={{
                              current: completedMilestones,
                              total: safeTotal,
                            }}
                            nextStep={t.goal || undefined}
                            milestones={t.milestones}
                            onClick={() => {
                              setSelectedTask(t);
                              setEditingTask(t);
                              closeCategoryModal();
                            }}
                            className="cursor-pointer"
                          />
                        </div>
                      );
                    })}

                    {visibleTasks.length === 0 && (
                      <div
                        style={{
                          padding: '20px',
                          textAlign: 'center',
                          color: '#64748b',
                          fontFamily: typography.fontFamily,
                          fontWeight: 700,
                          borderRadius: '14px',
                          border: '1px dashed rgba(148,163,184,0.35)',
                          background: 'rgba(248,250,252,0.8)',
                        }}
                      >
                        אין משימות תואמות לחיפוש.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* Task Drawer */}
      {selectedTask && editingTask && (
        <>
          <div
            onClick={() => { setSelectedTask(null); setEditingTask(null); }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 40,
              animation: 'fadeIn 0.2s'
            }}
          />
          <div style={{
            position: 'fixed',
            right: 0,
            top: 0,
            bottom: 0,
            width: '600px',
            maxWidth: '100%',
            background: 'white',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
            zIndex: 50,
            overflowY: 'auto',
            animation: 'slideIn 0.3s ease-out'
          }}>
            <style>{`
              @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
              @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
            `}</style>
            
            <div style={{
              position: 'sticky',
              top: 0,
              background: 'white',
              borderBottom: '1px solid #e5e5e5',
              padding: '20px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 10
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>פרטי פרויקט</h2>
              <button
                onClick={() => { setSelectedTask(null); setEditingTask(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '8px',
                  color: '#737373',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#171717'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#737373'}
              >
                ✕
              </button>
            </div>

            <div style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: 'Rubik',
              fontWeight: '500',
              color: 'rgba(10, 10, 10, 1)',
            }}>
              {/* Read-only notice for non-owners */}
              {user && !canEdit && (
                <div style={{
                  background: '#fefce8', border: '1px solid #fde68a',
                  borderRadius: '8px', padding: '10px 16px',
                  fontSize: '13px', color: '#92400e', marginBottom: '16px',
                }}>
                  אתה צופה בפרויקט זה במצב קריאה בלבד
                </div>
              )}
              {/* Stepper Progress Bar */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  {stepConfig.map((step, index) => {
                    const isActive = index === activeStep;
                    const isComplete = step.isComplete(editingTask);
                    
                    return (
                      <div
                        key={step.id}
                        onClick={() => setActiveStep(index)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          cursor: 'pointer',
                          opacity: isActive ? 1 : 0.6,
                          transition: 'all 0.2s',
                        }}
                      >
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: isComplete
                              ? '#22c55e'
                              : isActive
                              ? '#0ea5e9'
                              : '#e5e5e5',
                            color: isComplete || isActive ? 'white' : '#737373',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            marginBottom: '8px',
                            border: isActive ? '3px solid #0284c7' : 'none',
                            transition: 'all 0.2s',
                            boxShadow: isComplete ? '0 2px 8px rgba(34, 197, 94, 0.3)' : 'none',
                          }}
                        >
                          {step.icon}
                        </div>
                        <div
                          style={{
                            width: '47px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAlign: 'center',
                            color: isActive ? '#0f172a' : '#64748b',
                          }}
                        >
                          {step.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step Header */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '28px' }}>{stepConfig[activeStep].icon}</span>
                  {stepConfig[activeStep].label}
                </h3>
                <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
                  {stepConfig[activeStep].description}
                </p>
              </div>

              {/* Step Content - Scrollable */}
              <div style={{ marginBottom: '24px' }}>
                {/* STEP 0: Basics */}
                {activeStep === 0 && (
                  <div style={{ display: 'grid', gap: '20px' }}>
                    <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                      <p style={{ fontSize: '13px', color: '#0369a1', margin: 0 }}>
                        💡 התחל בהגדרת הפרטים הבסיסיים של הפרויקט
                      </p>
                    </div>

                    {/* Title Input */}
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '8px' }}>
                        כותרת <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={editingTask.title}
                        onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                        placeholder="לדוגמא: תכנון וביצוע סדנאות הדרכה"
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: !editingTask.title?.trim() ? '2px solid #fca5a5' : '1px solid #e5e5e5',
                          borderRadius: '8px',
                          fontSize: '16px',
                          fontFamily: 'inherit'
                        }}
                      />
                      {!editingTask.title?.trim() && (
                        <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                          שדה חובה - יש להזין כותרת
                        </div>
                      )}
                    </div>

                    {/* Description Input */}
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '8px' }}>
                        תיאור
                      </label>
                      <textarea
                        value={editingTask.description}
                        onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                        placeholder="תיאור קצר של הפרויקט..."
                        rows={4}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #e5e5e5',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    {/* Owner / Assigned-to dropdown */}
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '8px' }}>
                        אחראי
                      </label>
                      <select
                        value={editingTask.assignedTo ?? ''}
                        onChange={(e) => {
                          const profileId = e.target.value || null;
                          const profile = profiles.find(p => p.id === profileId);
                          setEditingTask({
                            ...editingTask,
                            assignedTo: profileId,
                            owner: profile ? (profile.full_name || profile.email) : '',
                          });
                        }}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #e5e5e5',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          background: 'white',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="">— ללא אחראי —</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.full_name || p.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Participants multi-select */}
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '8px' }}>
                        משתתפים
                      </label>
                      <div style={{
                        border: '1px solid #e5e5e5',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        maxHeight: '180px',
                        overflowY: 'auto',
                        background: 'white',
                      }}>
                        {profiles.length === 0 ? (
                          <div style={{ fontSize: '13px', color: '#94a3b8', padding: '4px 0' }}>אין משתמשים זמינים</div>
                        ) : profiles.map(p => {
                          const currentParticipants = editingTask.participants ?? [];
                          const checked = currentParticipants.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '6px 4px',
                                cursor: 'pointer',
                                borderRadius: '4px',
                                fontSize: '14px',
                                color: '#374151',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const prev = editingTask.participants ?? [];
                                  const newParticipants = e.target.checked
                                    ? [...prev, p.id]
                                    : prev.filter(id => id !== p.id);
                                  setEditingTask({ ...editingTask, participants: newParticipants });
                                }}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                              {p.full_name || p.email}
                            </label>
                          );
                        })}
                      </div>
                      {(editingTask.participants ?? []).length > 0 && (
                        <div style={{ fontSize: '12px', color: '#6366f1', marginTop: '4px' }}>
                          {(editingTask.participants ?? []).length} משתתף{(editingTask.participants ?? []).length > 1 ? 'ים' : ''} נבחר{(editingTask.participants ?? []).length > 1 ? 'ו' : ''}
                        </div>
                      )}
                    </div>

                    {/* Priority Selector */}
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '8px' }}>
                        דחיפות (Priority)
                      </label>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        {(['P1', 'P2', 'P3'] as const).map((priority) => {
                          const isSelected = editingTask.priority === priority;
                          const colors = {
                            P1: { bg: '#fee2e2', border: '#ef4444', text: '#dc2626' },
                            P2: { bg: '#fed7aa', border: '#f97316', text: '#ea580c' },
                            P3: { bg: '#e0e7ff', border: '#6366f1', text: '#4f46e5' }
                          };
                          const color = colors[priority];
                          
                          return (
                            <button
                              key={priority}
                              type="button"
                              onClick={() => setEditingTask({ ...editingTask, priority })}
                              style={{
                                flex: 1,
                                padding: '12px',
                                background: isSelected ? color.bg : 'white',
                                border: `2px solid ${isSelected ? color.border : '#e5e5e5'}`,
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: isSelected ? '700' : '500',
                                color: isSelected ? color.text : '#737373',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontFamily: 'inherit'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.borderColor = color.border;
                                  e.currentTarget.style.background = color.bg;
                                  e.currentTarget.style.color = color.text;
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.borderColor = '#e5e5e5';
                                  e.currentTarget.style.background = 'white';
                                  e.currentTarget.style.color = '#737373';
                                }
                              }}
                            >
                              {priority === 'P1' && 'P1 - דחוף'}
                              {priority === 'P2' && 'P2 - בינוני'}
                              {priority === 'P3' && 'P3 - נמוך'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 1: Project Definition */}
                {activeStep === 1 && (
                  <div style={{ display: 'grid', gap: '20px' }}>
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                      <p style={{ fontSize: '13px', color: '#15803d', margin: 0 }}>
                        🏥 אפיין את התהליך והבעיה שהפרויקט מטפל בהם
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                          מחלקה
                        </label>
                        <input
                          type="text"
                          value={editingTask.department || ''}
                          onChange={(e) => setEditingTask({ ...editingTask, department: e.target.value })}
                          placeholder="לדוגמא: הנהלה"
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #e5e5e5',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                          שם תהליך
                        </label>
                        <input
                          type="text"
                          value={editingTask.processName || ''}
                          onChange={(e) => setEditingTask({ ...editingTask, processName: e.target.value })}
                          placeholder="לדוגמא: תכנון אסטרטגי"
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #e5e5e5',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                        הגדרת הבעיה
                      </label>
                      <textarea
                        value={editingTask.problemStatement || ''}
                        onChange={(e) => setEditingTask({ ...editingTask, problemStatement: e.target.value })}
                        placeholder="מה הבעיה או נקודת הכאב הנוכחית?"
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #e5e5e5',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                        מטרה
                      </label>
                      <input
                        type="text"
                        value={editingTask.goal || ''}
                        onChange={(e) => setEditingTask({ ...editingTask, goal: e.target.value })}
                        placeholder="מה המטרה המדידה?"
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #e5e5e5',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 2: KPI */}
                {activeStep === 2 && (
                  <div style={{ display: 'grid', gap: '20px' }}>
                    <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                      <p style={{ fontSize: '13px', color: '#1e40af', margin: 0 }}>
                        📊 הגדר כיצד תימדד ההצלחה של הפרויקט
                      </p>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                        שם המדד <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <textarea
                        value={editingTask.kpiName || ''}
                        onChange={(e) => setEditingTask({ ...editingTask, kpiName: e.target.value })}
                        placeholder="לדוגמא: מספר משתתפים מוסמכים"
                        rows={5}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: !editingTask.kpiName?.trim() ? '2px solid #fca5a5' : '1px solid #e5e5e5',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          minHeight: '140px'
                        }}
                      />
                      {!editingTask.kpiName?.trim() && (
                        <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>
                          שדה חובה - הגדר מדד להצלחה
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                          Baseline (נקודת התחלה) <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={editingTask.baseline || ''}
                          onChange={(e) => setEditingTask({ ...editingTask, baseline: e.target.value })}
                          placeholder="לדוגמא: 0"
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: !editingTask.baseline?.trim() ? '2px solid #fca5a5' : '1px solid #e5e5e5',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                          Target (יעד) <span style={{ color: '#ef4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={editingTask.target || ''}
                          onChange={(e) => setEditingTask({ ...editingTask, target: e.target.value })}
                          placeholder="לדוגמא: 50"
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: !editingTask.target?.trim() ? '2px solid #fca5a5' : '1px solid #e5e5e5',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                        תדירות מדידה
                      </label>
                      <input
                        type="text"
                        value={editingTask.measurementCadence || ''}
                        onChange={(e) => setEditingTask({ ...editingTask, measurementCadence: e.target.value })}
                        placeholder="לדוגמא: שבועי / חודשי / רבעוני"
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #e5e5e5',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 3: Timeline & Stakeholders */}
                {activeStep === 3 && (
                  <div style={{ display: 'grid', gap: '20px' }}>
                    <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                      <p style={{ fontSize: '13px', color: '#92400e', margin: 0 }}>
                        📅 קבע ציר זמן ומי בעלי העניין
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                          תאריך התחלה
                        </label>
                        <input
                          type="date"
                          value={editingTask.startDate || ''}
                          onChange={(e) => setEditingTask({ ...editingTask, startDate: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #e5e5e5',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                          תאריך יעד
                        </label>
                        <input
                          type="date"
                          value={editingTask.dueDate || ''}
                          onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #e5e5e5',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontFamily: 'inherit'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                        בעלי עניין (מופרד בפסיקים)
                      </label>
                      <input
                        type="text"
                        value={Array.isArray(editingTask.stakeholders) ? editingTask.stakeholders.join(', ') : ''}
                        onChange={(e) => setEditingTask({ 
                          ...editingTask, 
                          stakeholders: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                        })}
                        placeholder="מנכ״ל, מנהלת סיעוד, מנהל רפואי"
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #e5e5e5',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontFamily: 'inherit'
                        }}
                      />
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        הפרד בעלי עניין באמצעות פסיקים
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: Risks & Dependencies */}
                {activeStep === 4 && (
                  <div style={{ display: 'grid', gap: '20px' }}>
                    <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                      <p style={{ fontSize: '13px', color: '#991b1b', margin: 0 }}>
                        ⚠️ זהה סיכונים, חסמים ותלויות
                      </p>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                        סיכונים וחסמים
                      </label>
                      <textarea
                        value={editingTask.risksBlockers || ''}
                        onChange={(e) => setEditingTask({ ...editingTask, risksBlockers: e.target.value })}
                        placeholder="רשום סיכונים ידועים וחסמים פוטנציאליים"
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #e5e5e5',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                        תלויות במשימות אחרות
                      </label>
                      <input
                        type="text"
                        value={editingTask.dependencies || ''}
                        onChange={(e) => setEditingTask({ ...editingTask, dependencies: e.target.value })}
                        placeholder="לדוגמא: תלוי במשימה #1"
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #e5e5e5',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                        קישורים ומסמכים
                      </label>
                      <input
                        type="text"
                        value={editingTask.links || ''}
                        onChange={(e) => setEditingTask({ ...editingTask, links: e.target.value })}
                        placeholder="URL למסמכים, דרייב, וכו׳"
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #e5e5e5',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontFamily: 'inherit'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* STEP 5: Milestones */}
                {activeStep === 5 && (
                  <div style={{ display: 'grid', gap: '20px' }}>
                    <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                      <p style={{ fontSize: '13px', color: '#15803d', margin: 0 }}>
                        🎯 נהל אבני דרך וסמן התקדמות
                      </p>
                    </div>

                    {/* Progress Display */}
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', marginBottom: '8px' }}>התקדמות כוללת</div>
                      <div style={{ background: '#e5e5e5', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '8px' }}>
                        <div style={{
                          background: editingTask.progress >= 80 ? '#22c55e' : editingTask.progress >= 50 ? '#0ea5e9' : '#f59e0b',
                          height: '100%',
                          width: `${editingTask.progress}%`,
                          transition: 'width 0.3s'
                        }} />
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
                        {editingTask.progress}% • {editingTask.milestones.filter(m => m.done).length}/{editingTask.milestones.length} הושלמו
                      </div>
                    </div>

                    {/* Milestones List */}
                    <div>
                      {editingTask.milestones.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px', background: '#f8fafc', borderRadius: '8px', color: '#64748b' }}>
                          אין אבני דרך עדיין. הוסף את הראשונה למטה
                        </div>
                      ) : (
                        editingTask.milestones.map((milestone, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '14px',
                              border: '1px solid #e5e5e5',
                              borderRadius: '8px',
                              marginBottom: '8px',
                              background: milestone.done ? '#dcfce7' : 'white',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div 
                              onClick={() => toggleMilestone(i)}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                border: `2px solid ${milestone.done ? '#22c55e' : '#d4d4d4'}`,
                                background: milestone.done ? '#22c55e' : 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '16px',
                                flexShrink: 0,
                                transition: 'all 0.2s',
                                cursor: 'pointer'
                              }}
                            >
                              {milestone.done && '✓'}
                            </div>
                            <span style={{
                              fontSize: '14px',
                              color: milestone.done ? '#166534' : '#525252',
                              textDecoration: milestone.done ? 'line-through' : 'none',
                              flex: 1
                            }}>
                              {milestone.text}
                            </span>
                            <button
                              onClick={() => deleteMilestone(i)}
                              style={{
                                padding: '6px 12px',
                                background: '#fee2e2',
                                color: '#991b1b',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = '#fecaca'}
                              onMouseLeave={(e) => e.currentTarget.style.background = '#fee2e2'}
                            >
                              מחק
                            </button>
                          </div>
                        ))
                      )}

                      {/* Add New Milestone */}
                      <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          value={newMilestone}
                          onChange={(e) => setNewMilestone(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addMilestone()}
                          placeholder="הוסף אבן דרך חדשה..."
                          style={{
                            flex: 1,
                            padding: '12px',
                            border: '1px solid #e5e5e5',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontFamily: 'inherit'
                          }}
                        />
                        <button
                          onClick={addMilestone}
                          disabled={!newMilestone.trim()}
                          style={{
                            padding: '12px 20px',
                            background: newMilestone.trim() ? '#22c55e' : '#e5e5e5',
                            color: newMilestone.trim() ? 'white' : '#a3a3a3',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: newMilestone.trim() ? 'pointer' : 'not-allowed',
                            fontSize: '14px',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                          }}
                        >
                          הוסף
                        </button>
                      </div>

                      <div style={{ fontSize: '12px', color: '#737373', marginTop: '12px', textAlign: 'center' }}>
                        💡 לחץ על העיגול כדי לסמן אבן דרך כהושלמה
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid #e5e5e5' }}>
                <button
                  onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                  disabled={activeStep === 0}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: activeStep === 0 ? '#f5f5f5' : 'white',
                    color: activeStep === 0 ? '#a3a3a3' : '#525252',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: activeStep === 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: 'inherit'
                  }}
                >
                  ← הקודם
                </button>

                {user && canEdit && (
                  <button
                    onClick={handleSaveTask}
                    style={{
                      flex: 2,
                      padding: '14px',
                      background: '#0ea5e9',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontFamily: 'inherit'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#0284c7'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#0ea5e9'}
                  >
                    💾 שמור שינויים
                  </button>
                )}

                <button
                  onClick={() => setActiveStep(Math.min(stepConfig.length - 1, activeStep + 1))}
                  disabled={activeStep === stepConfig.length - 1}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: activeStep === stepConfig.length - 1 ? '#f5f5f5' : 'white',
                    color: activeStep === stepConfig.length - 1 ? '#a3a3a3' : '#525252',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: activeStep === stepConfig.length - 1 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    fontFamily: 'inherit'
                  }}
                >
                  הבא →
                </button>
              </div>

              {/* Delete Task Button — only for authenticated users */}
              {user && (
                <button
                  onClick={() => deleteTask(editingTask.id)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#fee2e2',
                    color: '#991b1b',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginTop: '16px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fecaca';
                    e.currentTarget.style.color = '#7f1d1d';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fee2e2';
                    e.currentTarget.style.color = '#991b1b';
                  }}
                >
                  🗑️ מחק משימה
                </button>
              )}

              {/* Keyboard Shortcuts Hint */}
              <div style={{ marginTop: '16px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'center', fontFamily: 'Rubik' }}>
                  <div style={{ fontWeight: '600', marginBottom: '6px' }}>⌨️ קיצורי מקלדת</div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <span>Ctrl+S - שמור</span>
                    <span>•</span>
                    <span>ESC - סגור</span>
                    <span>•</span>
                    <span>← → - ניווט בין שלבים</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* New Task Modal */}
      {showNewTaskModal && (
        <>
          <div
            onClick={() => setShowNewTaskModal(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 40,
              animation: 'fadeIn 0.2s'
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            maxWidth: '90%',
            maxHeight: '90vh',
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            zIndex: 50,
            overflowY: 'auto',
            animation: 'scaleIn 0.3s ease-out'
          }}>
            <style>{`
              @keyframes scaleIn { from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); } to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }
            `}</style>
            
            <div style={{
              position: 'sticky',
              top: 0,
              background: 'white',
              borderBottom: '1px solid #e5e5e5',
              padding: '20px 24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 10,
              borderRadius: '16px 16px 0 0'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>משימה חדשה</h2>
              <button
                onClick={() => setShowNewTaskModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '8px',
                  color: '#737373',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#171717'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#737373'}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const milestonesText = (formData.get('milestones') as string).split('\n').filter(m => m.trim());
                
                if (!formData.get('title') || !formData.get('category')) {
                  alert('יש למלא כותרת וקטגוריה');
                  return;
                }

                const stakeholdersText = (formData.get('stakeholders') as string || '').split(',').map(s => s.trim()).filter(s => s);

                const newTask: MedicalTask = {
                  id: crypto.randomUUID(),
                  title: formData.get('title') as string,
                  description: formData.get('description') as string || '',
                  category: formData.get('category') as string,
                  color: tasks.find(t => t.category === formData.get('category'))?.color || '#7dd3fc',
                  owner: formData.get('owner') as string || 'ללא אחראי',
                  assignedTo: null,
                  participants: [],
                  priority: (formData.get('priority') as 'P1' | 'P2' | 'P3') || 'P2',
                  progress: 0,
                  department: formData.get('department') as string || '',
                  processName: formData.get('processName') as string || '',
                  problemStatement: formData.get('problemStatement') as string || '',
                  goal: formData.get('goal') as string || '',
                  kpiName: formData.get('kpiName') as string || '',
                  baseline: formData.get('baseline') as string || '',
                  target: formData.get('target') as string || '',
                  measurementCadence: formData.get('measurementCadence') as string || '',
                  startDate: formData.get('startDate') as string || '',
                  dueDate: formData.get('dueDate') as string || '',
                  stakeholders: stakeholdersText,
                  risksBlockers: formData.get('risksBlockers') as string || '',
                  dependencies: formData.get('dependencies') as string || '',
                  links: formData.get('links') as string || '',
                  milestones: milestonesText.length > 0 ? milestonesText.map(text => ({ text, done: false })) : [{ text: 'שלב ראשון', done: false }],
                  status: 'open' as const,
                  currentState: '',
                  createdBy: null,
                };

                addNewTask(newTask);
              }}
              style={{ padding: '24px' }}
            >
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '8px' }}>
                  כותרת *
                </label>
                <input
                  name="title"
                  type="text"
                  required
                  placeholder="לדוגמא: הקמת מערכת ניהול"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '8px' }}>
                  קטגוריה *
                </label>
                <select
                  name="category"
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    background: 'white'
                  }}
                >
                  <option value="">בחר קטגוריה...</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '8px' }}>
                  תיאור
                </label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="תיאור המשימה..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '8px' }}>
                  אחראי
                </label>
                <input
                  name="owner"
                  type="text"
                  list="owners-directory-new"
                  placeholder="שם האחראי"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
                <datalist id="owners-directory-new">
                  {owners.map((o) => (
                    <option key={o} value={o} />
                  ))}
                </datalist>
              </div>

              {/* Priority Selector */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '8px' }}>
                  דחיפות (Priority)
                </label>
                <select
                  name="priority"
                  defaultValue="P2"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    cursor: 'pointer'
                  }}
                >
                  <option value="P1">P1 - דחוף</option>
                  <option value="P2">P2 - בינוני</option>
                  <option value="P3">P3 - נמוך</option>
                </select>
              </div>

              {/* Advanced Fields Collapsible */}
              <details style={{ marginBottom: '20px' }}>
                <summary style={{
                  padding: '12px',
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#0369a1',
                  listStyle: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>⚙️ פרטים מתקדמים (אופציונלי)</span>
                  <span style={{ fontSize: '12px', marginRight: 'auto' }}>לחץ לפתיחה</span>
                </summary>
                
                <div style={{ padding: '16px', background: '#fafafa', borderRadius: '0 0 8px 8px', marginTop: '-8px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                        מחלקה
                      </label>
                      <input name="department" type="text" placeholder="לדוגמא: הנהלה" style={{
                        width: '100%', padding: '10px', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', background: 'white'
                      }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                        שם תהליך
                      </label>
                      <input name="processName" type="text" placeholder="לדוגמא: תכנון" style={{
                        width: '100%', padding: '10px', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', background: 'white'
                      }} />
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                      הגדרת הבעיה
                    </label>
                    <textarea name="problemStatement" rows={2} placeholder="מה הבעיה?" style={{
                      width: '100%', padding: '10px', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', background: 'white'
                    }} />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                      מטרה
                    </label>
                    <input name="goal" type="text" placeholder="מה היעד?" style={{
                      width: '100%', padding: '10px', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', background: 'white'
                    }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                        שם מדד (KPI)
                      </label>
                      <input name="kpiName" type="text" placeholder="מדד למעקב" style={{
                        width: '100%', padding: '10px', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', background: 'white'
                      }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                        Baseline
                      </label>
                      <input name="baseline" type="text" placeholder="0" style={{
                        width: '100%', padding: '10px', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', background: 'white'
                      }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                        Target
                      </label>
                      <input name="target" type="text" placeholder="100" style={{
                        width: '100%', padding: '10px', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', background: 'white'
                      }} />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                        תאריך התחלה
                      </label>
                      <input name="startDate" type="date" style={{
                        width: '100%', padding: '10px', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', background: 'white'
                      }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                        תאריך יעד
                      </label>
                      <input name="dueDate" type="date" style={{
                        width: '100%', padding: '10px', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', background: 'white'
                      }} />
                    </div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                      בעלי עניין (מופרד בפסיקים)
                    </label>
                    <input name="stakeholders" type="text" placeholder="מנכ״ל, מנהל, צוות" style={{
                      width: '100%', padding: '10px', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', background: 'white'
                    }} />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                      סיכונים וחסמים
                    </label>
                    <textarea name="risksBlockers" rows={2} placeholder="רשום סיכונים..." style={{
                      width: '100%', padding: '10px', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', background: 'white'
                    }} />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                      תלויות
                    </label>
                    <input name="dependencies" type="text" placeholder="תלוי במשימה #X" style={{
                      width: '100%', padding: '10px', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', background: 'white'
                    }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                      קישורים
                    </label>
                    <input name="links" type="text" placeholder="https://..." style={{
                      width: '100%', padding: '10px', border: '1px solid #e5e5e5', borderRadius: '6px', fontSize: '13px', fontFamily: 'inherit', background: 'white'
                    }} />
                  </div>
                </div>
              </details>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '8px' }}>
                  מיילסטונים (שורה אחת לכל מיילסטון)
                </label>
                <textarea
                  name="milestones"
                  rows={4}
                  placeholder={'אישור ראשוני\nאיסוף נתונים\nבניית מערכת\nבדיקות\nהשקה'}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: '#22c55e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#16a34a'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#22c55e'}
                >
                  צור משימה
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  style={{
                    padding: '14px 24px',
                    background: '#f5f5f5',
                    color: '#525252',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#e5e5e5'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f5f5f5'}
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <>
          <div
            onClick={() => setShowKeyboardShortcuts(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 60,
              animation: 'fadeIn 0.2s'
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            zIndex: 61,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            animation: 'scaleIn 0.2s ease-out'
          }}>
            <style>{`
              @keyframes scaleIn {
                from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
                to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
              }
            `}</style>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, marginBottom: '4px' }}>
                  ⌨️ קיצורי מקלדת
                </h2>
                <p style={{ fontSize: '14px', color: '#737373', margin: 0 }}>
                  תרגמו את העבודה שלכם למהירה יותר
                </p>
              </div>
              <button
                onClick={() => setShowKeyboardShortcuts(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '8px',
                  color: '#737373',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#171717'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#737373'}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* General Actions */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#171717', marginBottom: '12px' }}>
                  פעולות כלליות
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { keys: ['N'], desc: 'משימה חדשה' },
                    { keys: ['/'], desc: 'מיקוד בחיפוש' },
                    { keys: ['ESC'], desc: 'סגור חלונות/מגירות' },
                    { keys: ['Shift', '?'], desc: 'הצג קיצורי מקלדת' },
                    { keys: ['Ctrl/⌘', 'E'], desc: 'ייצוא נתונים' }
                  ].map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#fafafa',
                      borderRadius: '8px'
                    }}>
                      <span style={{ fontSize: '14px', color: '#525252' }}>{item.desc}</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {item.keys.map((key, kidx) => (
                          <kbd key={kidx} style={{
                            background: 'white',
                            border: '2px solid #e5e5e5',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '12px',
                            fontWeight: '700',
                            fontFamily: 'monospace',
                            boxShadow: '0 2px 0 #d4d4d4'
                          }}>{key}</kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#171717', marginBottom: '12px' }}>
                  ניווט
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { keys: ['1'], desc: 'עמוד הבית' },
                    { keys: ['2'], desc: 'משימות' },
                    { keys: ['3'], desc: 'התמונה הגדולה' }
                  ].map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#fafafa',
                      borderRadius: '8px'
                    }}>
                      <span style={{ fontSize: '14px', color: '#525252' }}>
                        {item.desc}
                      </span>
                      <kbd style={{
                        background: 'white',
                        border: '2px solid #e5e5e5',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '12px',
                        fontWeight: '700',
                        fontFamily: 'monospace',
                        boxShadow: '0 2px 0 #d4d4d4'
                      }}>{item.keys[0]}</kbd>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: 'linear-gradient(135deg, #667eea20, #764ba220)',
                border: '2px solid #667eea40',
                borderRadius: '12px',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '13px', color: '#525252', margin: 0, lineHeight: '1.6' }}>
                  <strong>טיפ:</strong> לחץ על <kbd style={{
                    background: 'white',
                    border: '1px solid #d4d4d4',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '11px',
                    fontWeight: '600',
                    fontFamily: 'monospace'
                  }}>?</kbd> בכל עת כדי לראות את רשימת הקיצורים
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Category Modal */}
      {showAddCategory && (
        <>
          <div
            onClick={() => setShowAddCategory(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 40,
              animation: 'fadeIn 0.2s'
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '500px',
            maxWidth: '90%',
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            zIndex: 50,
            animation: 'scaleIn 0.3s ease-out'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              color: 'white',
              padding: '20px 24px',
              borderRadius: '16px 16px 0 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>קטגוריה חדשה</h2>
              <button
                onClick={() => setShowAddCategory(false)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px 10px',
                  color: 'white',
                  borderRadius: '6px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                addCategory(
                  formData.get('categoryName') as string,
                  formData.get('categoryColor') as string
                );
              }}
              style={{ padding: '24px' }}
            >
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '8px' }}>
                  שם הקטגוריה *
                </label>
                <input
                  name="categoryName"
                  type="text"
                  required
                  placeholder="לדוגמא: תשתיות IT"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '2px solid #e5e5e5',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '8px' }}>
                  צבע הקטגוריה *
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    name="categoryColor"
                    type="color"
                    defaultValue="#7dd3fc"
                    required
                    style={{
                      width: '60px',
                      height: '60px',
                      border: '2px solid #e5e5e5',
                      borderRadius: '10px',
                      cursor: 'pointer'
                    }}
                  />
                  <span style={{ fontSize: '13px', color: '#737373' }}>
                    בחר צבע שמייצג את הקטגוריה
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                  }}
                >
                  צור קטגוריה
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddCategory(false)}
                  style={{
                    padding: '14px 24px',
                    background: '#f5f5f5',
                    color: '#525252',
                    border: '1px solid #e5e5e5',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#e5e5e5'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f5f5f5'}
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Footer */}
      <footer style={{
        width: '100%',
        padding: '16px 24px',
        background: 'white',
        color: '#525252',
        textAlign: 'right',
        fontSize: '12px',
        fontWeight: '500',
        fontFamily: typography.fontFamily,
        borderTop: '1px solid #e5e5e5',
        marginTop: 'auto'
      }}>
        פיתוח: שי שבו, המרכז הרפואי הלל יפה
      </footer>

      {/* Login Modal */}
      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} />
      )}

      {showProfileEdit && (
        <ProfileEditModal onClose={() => setShowProfileEdit(false)} />
      )}

      {/* Quick View Modal — Work Queue section */}
      {quickViewTask && (
        <QuickViewModal task={quickViewTask} onClose={() => setQuickViewTask(null)} />
      )}

      {/* Big Picture Modal — portal, rendered once at app root */}
      <BigPictureModal />

      {/* Mobile overlays (My Work / Settings) */}
      {user && mobilePage === 'my-work' && (
        <MobileMyWorkView onClose={() => setMobilePage(null)} />
      )}
      {user && mobilePage === 'settings' && (
        <MobileSettingsView
          user={user}
          profile={profile}
          isAdmin={isAdmin ?? false}
          onClose={() => setMobilePage(null)}
          onEditProfile={() => setShowProfileEdit(true)}
          onSignOut={signOut}
        />
      )}

      {/* Mobile header — fixed top bar, hidden on md+ */}
      <MobileHeader user={user} onAddTask={() => setShowAddCategory(true)} />

      {/* Mobile bottom navigation — hidden on md+ */}
      {user && (
        <BottomNav
          activeTab={
            mobilePage === 'my-work'   ? 'my-work'     :
            mobilePage === 'settings'  ? 'settings'    :
            viewMode   === 'tree'      ? 'big-picture' : 'home'
          }
          onTabChange={(tab: MobileTab) => {
            if (tab === 'home') {
              setMobilePage(null);
              setViewMode('command');
              if (taskMatch) navigate('/');
            } else if (tab === 'big-picture') {
              setMobilePage(null);
              setViewMode('tree');
              setTreeFullscreen(true);
              if (taskMatch) navigate('/');
            } else if (tab === 'my-work') {
              setMobilePage('my-work');
            } else if (tab === 'settings') {
              setMobilePage('settings');
            }
          }}
        />
      )}
    </div>
  );
}

export default App;
