import { useState, useEffect, useRef } from 'react';
import { ToastContainer, type ToastMessage } from './components/Toast';
import { Button, Card, StatPill } from './components/ui';
import { colors, typography, spacing, radius, shadows } from './styles/tokens';
import { TasksDashboard } from './components/tasks/TasksDashboard';

// Mock data - Enhanced for Hospital Process Improvement
const initialTasks = [
  { 
    id: 1, 
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
    id: 2, 
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
    id: 3, 
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
    id: 4, 
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
    id: 5, 
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
    id: 6, 
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
    id: 7, 
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
    id: 8, 
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
    id: 9, 
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

function App() {
  const [tasks, setTasks] = useState(initialTasks);
  const [viewMode, setViewMode] = useState<'rows' | 'tree' | 'dashboard' | 'byOwner'>('rows');
  const [selectedTask, setSelectedTask] = useState<typeof tasks[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTask, setEditingTask] = useState<typeof tasks[0] | null>(null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [newMilestone, setNewMilestone] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [hoveredTaskInTree, setHoveredTaskInTree] = useState<typeof tasks[0] | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Computed values
  const categories = [...new Set(tasks.map(t => t.category))];
  const owners = [...new Set(tasks.map(t => t.owner))];
  
  // Start with all categories collapsed
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Allow ESC to close modals even when in input
        if (e.key === 'Escape') {
          if (showNewTaskModal) {
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

      // N - New Task
      if (e.key === 'n' || e.key === 'N') {
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
        if (showNewTaskModal) {
          setShowNewTaskModal(false);
        } else if (editingTask) {
          setSelectedTask(null);
          setEditingTask(null);
        } else if (showKeyboardShortcuts) {
          setShowKeyboardShortcuts(false);
        }
        e.preventDefault();
      }

      // 1-4 - Switch views
      if (e.key === '1') {
        setViewMode('dashboard');
        e.preventDefault();
      }
      if (e.key === '2') {
        setViewMode('rows');
        e.preventDefault();
      }
      if (e.key === '3') {
        setViewMode('byOwner');
        e.preventDefault();
      }
      if (e.key === '4') {
        setViewMode('tree');
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
  }, [showNewTaskModal, editingTask, showKeyboardShortcuts]);

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

  const handleSaveTask = () => {
    if (editingTask) {
      setTasks(tasks.map(t => t.id === editingTask.id ? editingTask : t));
      setSelectedTask(editingTask);
      setEditingTask(null);
      showToast('השינויים נשמרו בהצלחה!', 'success');
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

  const deleteTask = (taskId: number) => {
    if (confirm('❓ האם אתה בטוח שברצונך למחוק משימה זו?')) {
      setTasks(tasks.filter(t => t.id !== taskId));
      setSelectedTask(null);
      setEditingTask(null);
      showToast('המשימה נמחקה בהצלחה', 'success');
    }
  };

  const addNewTask = (newTask: typeof tasks[0]) => {
    setTasks([...tasks, newTask]);
    setShowNewTaskModal(false);
    showToast('המשימה נוספה בהצלחה!', 'success');
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

  const toggleTaskExpand = (taskId: number) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const updateCategoryColor = (oldCategory: string, newColor: string) => {
    setTasks(tasks.map(task =>
      task.category === oldCategory ? { ...task, color: newColor } : task
    ));
    showToast('צבע הקטגוריה עודכן', 'success');
  };

  const renameCategory = (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;
    if (categories.includes(newName)) {
      showToast('שם קטגוריה כבר קיים', 'error');
      return;
    }
    setTasks(tasks.map(task =>
      task.category === oldName ? { ...task, category: newName } : task
    ));
    setExpandedCategories(prev => prev.map(c => c === oldName ? newName : c));
    setEditingCategory(null);
    showToast('שם הקטגוריה עודכן', 'success');
  };

  const deleteCategory = (category: string) => {
    if (!confirm(`האם למחוק את הקטגוריה "${category}" ואת כל המשימות בה?`)) return;
    setTasks(tasks.filter(t => t.category !== category));
    setExpandedCategories(prev => prev.filter(c => c !== category));
    showToast('הקטגוריה נמחקה', 'success');
  };

  const addCategory = (name: string, color: string) => {
    if (!name.trim()) return;
    if (categories.includes(name)) {
      showToast('שם קטגוריה כבר קיים', 'error');
      return;
    }
    // Add a dummy task to create the category
    const newTask = {
      id: Math.max(...tasks.map(t => t.id)) + 1,
      title: 'משימה ראשונה ב-' + name,
      description: 'תיאור המשימה',
      category: name,
      color: color,
      owner: 'ללא אחראי',
      priority: 'P2',
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
      milestones: [{ text: 'שלב ראשון', done: false }]
    };
    setTasks([...tasks, newTask]);
    setExpandedCategories([...expandedCategories, name]);
    setShowAddCategory(false);
    showToast('קטגוריה חדשה נוספה', 'success');
  };

  // Helper functions for dashboard metrics
  const isOverdue = (task: typeof tasks[0]) => {
    if (!task.dueDate) return false;
    return new Date(task.dueDate) < new Date();
  };

  const hasBlocker = (task: typeof tasks[0]) => {
    return !!(task.risksBlockers && task.risksBlockers.trim());
  };

  const hasKpi = (task: typeof tasks[0]) => {
    return !!(task.kpiName && task.kpiName.trim());
  };

  const isUnassigned = (task: typeof tasks[0]) => {
    return !task.owner || task.owner === 'ללא אחראי' || task.owner.trim() === '';
  };

  // Priority badge component
  const getPriorityBadge = (priority: string, size: 'small' | 'medium' = 'small') => {
    const config = {
      P1: { emoji: '🔴', text: 'P1', bg: '#fee2e2', color: '#dc2626', label: 'דחוף' },
      P2: { emoji: '🟠', text: 'P2', bg: '#fed7aa', color: '#ea580c', label: 'בינוני' },
      P3: { emoji: '🔵', text: 'P3', bg: '#e0e7ff', color: '#4f46e5', label: 'נמוך' }
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
        <span style={{ fontSize: isSmall ? '10px' : '12px' }}>{p.emoji}</span>
        {p.text}
      </span>
    );
  };

  // Sort by priority
  const sortByPriority = (a: typeof tasks[0], b: typeof tasks[0]) => {
    const priorityOrder = { P1: 1, P2: 2, P3: 3 };
    const aPriority = priorityOrder[(a.priority || 'P2') as keyof typeof priorityOrder] || 2;
    const bPriority = priorityOrder[(b.priority || 'P2') as keyof typeof priorityOrder] || 2;
    return aPriority - bPriority;
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
  const renderTreeDiagram = (variant: 'dashboard' | 'full') => {
    const isDashboard = variant === 'dashboard';
    
    return (
      <div style={{ padding: isDashboard ? '0' : spacing.xxl }}>
        {!isDashboard && (
          <h2 style={{ 
            fontSize: typography.fontSize.h1, 
            fontWeight: typography.fontWeight.black, 
            color: colors.text.primary, 
            fontFamily: typography.fontFamily,
            marginBottom: spacing.xxxxl, 
            textAlign: 'center',
            letterSpacing: '-1px'
          }}>
            🌳 דיאגרמת עץ - מבנה פרויקט GROW
          </h2>
        )}
        
        {/* Project Root */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.xxxxl }}>
          <div style={{
            padding: `${spacing.xl} ${spacing.xxxxl}`,
            background: colors.brand.gradient,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            color: colors.text.inverse,
            borderRadius: radius.xl,
            fontSize: typography.fontSize.h2,
            fontWeight: typography.fontWeight.black,
            fontFamily: typography.fontFamily,
            boxShadow: shadows.brand,
            border: `1px solid rgba(255, 255, 255, 0.2)`,
            letterSpacing: '-0.5px'
          }}>
            GROW - מחזור ב מובילים שינוי
          </div>

          {/* Categories */}
          <div style={{ display: 'flex', gap: spacing.xxxxl, flexWrap: 'wrap', justifyContent: 'center' }}>
            {categories.map(category => {
              const categoryTasks = tasks.filter(t => t.category === category);
              const color = categoryTasks[0].color;
              const avgProgress = Math.round(categoryTasks.reduce((sum, t) => sum + t.progress, 0) / categoryTasks.length);

              return (
                <div key={category} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.xl }}>
                  {/* Line to parent */}
                  <div style={{ 
                    width: '3px', 
                    height: spacing.xxxxl, 
                    background: `linear-gradient(180deg, ${color}00, ${color})`,
                    borderRadius: radius.sm
                  }} />
                  
                  {/* Category Node */}
                  <div style={{
                    padding: `${spacing.lg} ${spacing.xxl}`,
                    background: colors.surface.glass,
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: `2px solid ${color}`,
                    borderRadius: radius.lg,
                    minWidth: '220px',
                    textAlign: 'center',
                    boxShadow: `0 8px 24px ${color}25`,
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ 
                      height: '4px', 
                      background: color, 
                      borderRadius: '2px',
                      marginBottom: '8px'
                    }} />
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#171717', marginBottom: '8px' }}>
                      {category}
                    </div>
                    <div style={{ fontSize: '13px', color: '#737373' }}>
                      {categoryTasks.length} משימות | {avgProgress}%
                    </div>
                  </div>

                  {/* Tasks */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', position: 'relative' }}>
                    {categoryTasks.map((task, idx) => (
                      <div key={task.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                        {idx === 0 && <div style={{ width: '2px', height: '20px', background: color }} />}
                        <div
                          onClick={() => { setSelectedTask(task); setEditingTask(task); }}
                          onMouseEnter={() => setHoveredTaskInTree(task)}
                          onMouseLeave={() => setHoveredTaskInTree(null)}
                          style={{
                            padding: '12px 16px',
                            background: 'white',
                            border: `2px solid ${color}40`,
                            borderRadius: '8px',
                            minWidth: '200px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: hoveredTaskInTree?.id === task.id ? `0 8px 24px ${color}40` : '0 2px 8px rgba(0,0,0,0.06)',
                            transform: hoveredTaskInTree?.id === task.id ? 'scale(1.08)' : 'scale(1)',
                            position: 'relative',
                            zIndex: hoveredTaskInTree?.id === task.id ? 20 : 1
                          }}
                        >
                          <div style={{ fontSize: '14px', fontWeight: '600', color: '#171717', marginBottom: '6px' }}>
                            {task.title}
                          </div>
                          <div style={{ fontSize: '12px', color: '#737373', marginBottom: '6px' }}>
                            👤 {task.owner}
                          </div>
                          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
                            {getPriorityBadge(task.priority || 'P2', 'small')}
                          </div>
                          <div style={{ background: '#e5e5e5', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{
                              background: color,
                              height: '100%',
                              width: `${task.progress}%`
                            }} />
                          </div>
                          <div style={{ fontSize: '11px', color: '#a3a3a3', marginTop: '4px', textAlign: 'center' }}>
                            {task.progress}% | 🎯 {task.milestones.filter(m => m.done).length}/{task.milestones.length}
                          </div>
                          
                          {/* Rich Tooltip */}
                          {hoveredTaskInTree?.id === task.id && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              right: '50%',
                              transform: 'translateX(50%)',
                              marginTop: '12px',
                              minWidth: '320px',
                              maxWidth: '400px',
                              background: 'white',
                              border: `2px solid ${color}`,
                              borderRadius: '12px',
                              padding: '16px',
                              boxShadow: `0 8px 32px ${color}40`,
                              zIndex: 100,
                              animation: 'fadeIn 0.2s',
                              fontSize: '13px',
                              textAlign: 'right'
                            }}>
                              <style>{`
                                @keyframes fadeIn {
                                  from { opacity: 0; transform: translateX(50%) translateY(-5px); }
                                  to { opacity: 1; transform: translateX(50%) translateY(0); }
                                }
                              `}</style>
                              
                              <div style={{ fontSize: '15px', fontWeight: '700', color: '#171717', marginBottom: '10px' }}>
                                {task.title}
                              </div>
                              
                              {task.description && (
                                <div style={{ marginBottom: '10px', color: '#525252', lineHeight: '1.5' }}>
                                  {task.description}
                                </div>
                              )}
                              
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px', paddingTop: '10px', borderTop: '1px solid #e5e5e5' }}>
                                {task.department && (
                                  <div>
                                    <span style={{ color: '#737373' }}>מחלקה: </span>
                                    <span style={{ fontWeight: '600', color: '#171717' }}>{task.department}</span>
                                  </div>
                                )}
                                {task.dueDate && (
                                  <div>
                                    <span style={{ color: '#737373' }}>יעד: </span>
                                    <span style={{ fontWeight: '600', color: '#f59e0b' }}>{task.dueDate}</span>
                                  </div>
                                )}
                                {task.kpiName && (
                                  <div style={{ gridColumn: '1 / -1' }}>
                                    <span style={{ color: '#737373' }}>KPI: </span>
                                    <span style={{ fontWeight: '600', color: '#0ea5e9' }}>{task.kpiName}</span>
                                  </div>
                                )}
                              </div>
                              
                              {task.stakeholders && task.stakeholders.length > 0 && (
                                <div style={{ fontSize: '12px', color: '#737373', paddingTop: '8px', borderTop: '1px solid #e5e5e5' }}>
                                  👥 {task.stakeholders.join(', ')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {idx < categoryTasks.length - 1 && <div style={{ width: '2px', height: '12px', background: color + '40' }} />}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: colors.background.primary,
      direction: 'rtl', 
      fontFamily: typography.fontFamily,
      position: 'relative'
    }}>
      {/* Global Responsive Styles */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .mobile-menu { display: flex !important; }
        }
        @media (min-width: 769px) {
          .mobile-only { display: none !important; }
          .mobile-menu { display: none !important; }
        }
      `}</style>
      
      {/* Header */}
      <header style={{
        borderBottom: '2px solid #e5e5e5',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        position: 'sticky',
        top: 0,
        zIndex: 30
      }}>
        <div style={{
          maxWidth: '1920px',
          margin: '0 auto',
          display: 'flex',
          height: '72px',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.lg }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: radius.lg,
              background: colors.brand.gradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              boxShadow: shadows.brand
            }}>
              🏥
            </div>
            <div>
              <h1 style={{ 
                fontSize: typography.fontSize.h1, 
                fontWeight: typography.fontWeight.black, 
                background: colors.text.gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                margin: 0,
                letterSpacing: '-1px',
                fontFamily: typography.fontFamily
              }}>
                GROW - מובילים שינוי
              </h1>
              <p style={{ 
                fontSize: typography.fontSize.sm, 
                color: colors.text.tertiary, 
                margin: 0, 
                fontWeight: typography.fontWeight.medium,
                fontFamily: typography.fontFamily
              }}>
                מערכת ניהול שיפור תהליכים - בית חולים
              </p>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="mobile-only"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              padding: '10px',
              background: 'white',
              border: '2px solid #e5e5e5',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '24px',
              transition: 'all 0.2s',
              display: 'none'
            }}
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>

          <div className="desktop-only" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setShowNewTaskModal(true)}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '14px',
                fontWeight: '700',
                transition: 'all 0.3s',
                marginLeft: '12px',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(34, 197, 94, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
              }}
            >
              <span style={{ fontSize: '16px' }}>➕</span>
              <span>משימה חדשה</span>
            </button>
            <button
              onClick={exportData}
              style={{
                padding: '10px 18px',
                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '14px',
                fontWeight: '700',
                transition: 'all 0.3s',
                marginLeft: '12px',
                boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(139, 92, 246, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
              }}
            >
              <span style={{ fontSize: '16px' }}>📤</span>
              <span>ייצוא</span>
            </button>
            <button
              onClick={() => setShowKeyboardShortcuts(true)}
              style={{
                padding: '10px 18px',
                background: 'white',
                color: '#525252',
                border: '2px solid #e5e5e5',
                borderRadius: '12px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s',
                marginLeft: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f5f5f5';
                e.currentTarget.style.borderColor = '#d4d4d4';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.borderColor = '#e5e5e5';
              }}
              title="Keyboard Shortcuts (Shift + ?)"
            >
              <span style={{ fontSize: '16px' }}>⌨️</span>
              <kbd style={{
                background: '#f5f5f5',
                border: '1px solid #d4d4d4',
                borderRadius: '4px',
                padding: '2px 6px',
                fontSize: '11px',
                fontWeight: '600',
                fontFamily: 'monospace'
              }}>?</kbd>
            </button>
            <div style={{ width: '2px', height: '32px', background: '#e5e5e5', marginLeft: '4px', marginRight: '4px' }} />
            {(['dashboard', 'rows', 'byOwner', 'tree'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '10px 18px',
                  background: viewMode === mode 
                    ? 'linear-gradient(135deg, #0ea5e9, #0284c7)' 
                    : 'white',
                  color: viewMode === mode ? 'white' : '#525252',
                  border: viewMode === mode ? 'none' : '2px solid #e5e5e5',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  fontWeight: viewMode === mode ? '700' : '600',
                  transition: 'all 0.3s',
                  boxShadow: viewMode === mode ? '0 4px 12px rgba(14, 165, 233, 0.3)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => {
                  if (viewMode === mode) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(14, 165, 233, 0.4)';
                  } else {
                    e.currentTarget.style.background = '#f5f5f5';
                    e.currentTarget.style.borderColor = '#d4d4d4';
                  }
                }}
                onMouseLeave={(e) => {
                  if (viewMode === mode) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(14, 165, 233, 0.3)';
                  } else {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#e5e5e5';
                  }
                }}
              >
                <span style={{ fontSize: '16px' }}>
                  {mode === 'dashboard' ? '📊' : mode === 'rows' ? '📋' : mode === 'byOwner' ? '👥' : '🌳'}
                </span>
                <span>
                  {mode === 'dashboard' ? 'דשבורד' : mode === 'rows' ? 'משימות' : mode === 'byOwner' ? 'לפי אחראי' : 'דיאגרמה'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div style={{
            position: 'absolute',
            top: '72px',
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
              <button
                onClick={() => { setShowNewTaskModal(true); setIsMobileMenuOpen(false); }}
                style={{
                  padding: '12px',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span>➕</span>
                <span>משימה חדשה</span>
              </button>

              <button
                onClick={() => { exportData(); setIsMobileMenuOpen(false); }}
                style={{
                  padding: '12px',
                  background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <span>📤</span>
                <span>ייצוא</span>
              </button>

              <div style={{ height: '2px', background: '#e5e5e5', margin: '8px 0' }} />

              {(['dashboard', 'rows', 'byOwner', 'tree'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => { setViewMode(mode); setIsMobileMenuOpen(false); }}
                  style={{
                    padding: '12px',
                    background: viewMode === mode 
                      ? 'linear-gradient(135deg, #0ea5e9, #0284c7)' 
                      : 'white',
                    color: viewMode === mode ? 'white' : '#525252',
                    border: viewMode === mode ? 'none' : '2px solid #e5e5e5',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span>
                    {mode === 'dashboard' ? '📊' : mode === 'rows' ? '📋' : mode === 'byOwner' ? '👥' : '🌳'}
                  </span>
                  <span>
                    {mode === 'dashboard' ? 'דשבורד' : mode === 'rows' ? 'משימות' : mode === 'byOwner' ? 'לפי אחראי' : 'דיאגרמה'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <main style={{ maxWidth: '1920px', margin: '0 auto', padding: '16px' }}>
        <style>{`
          @media (min-width: 769px) {
            main { padding: 24px !important; }
            main > div { padding: 32px !important; }
          }
          @media (max-width: 768px) {
            main { padding: 12px !important; }
            main > div { padding: 16px !important; }
          }
        `}</style>
          
          {/* Dashboard View - Hybrid Dashboard */}
          {viewMode === 'dashboard' && (
            <div style={{ padding: spacing.xxl, maxWidth: '1600px', margin: '0 auto' }}>
              {/* Dashboard Header */}
              <div style={{ 
                marginBottom: spacing.xxxl, 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                flexWrap: 'wrap', 
                gap: spacing.lg 
              }}>
                <div>
                  <h2 style={{ 
                    fontSize: typography.fontSize.display, 
                    fontWeight: typography.fontWeight.black, 
                    marginBottom: spacing.sm, 
                    color: colors.text.primary,
                    fontFamily: typography.fontFamily,
                    letterSpacing: '-1.5px'
                  }}>
                    <span style={{ fontSize: '40px', marginLeft: spacing.md }}>📊</span>
                    דשבורד ניהול שיפור תהליכים
                  </h2>
                  <p style={{ 
                    fontSize: typography.fontSize.lg, 
                    color: colors.text.tertiary,
                    fontFamily: typography.fontFamily,
                    fontWeight: typography.fontWeight.medium
                  }}>
                    תמונת מצב מלאה ומשימות לפעולה מיידית
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="lg"
                  icon={<span style={{ fontSize: '20px' }}>🌳</span>}
                  onClick={() => setViewMode('tree')}
                >
                  דיאגרמת עץ
                </Button>
              </div>

              {/* Management Strip */}
              <Card
                variant="premium"
                style={{
                  background: colors.brand.gradientSubtle,
                  border: `1px solid ${colors.border.glass}`,
                  marginBottom: spacing.xxl,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: spacing.xl,
                }}>
                  {/* Summary Stats */}
                  <div style={{ display: 'flex', gap: spacing.lg, flexWrap: 'wrap', alignItems: 'center' }}>
                    <StatPill 
                      icon="📋"
                      label="סה״כ פעילות"
                      value={tasks.filter(t => t.progress < 100).length}
                      variant="info"
                    />
                    <StatPill 
                      icon="🔴"
                      label="P1 דחוף"
                      value={tasks.filter(t => t.priority === 'P1' && t.progress < 100).length}
                      variant="danger"
                    />
                    <StatPill 
                      icon="⚠️"
                      label="איחור"
                      value={tasks.filter(isOverdue).length}
                      variant="warning"
                    />
                    <StatPill 
                      icon="🚧"
                      label="חסמים"
                      value={tasks.filter(hasBlocker).length}
                      variant="warning"
                    />
                    <StatPill 
                      icon="👤"
                      label="ללא אחראי"
                      value={tasks.filter(isUnassigned).length}
                      variant="info"
                    />
                  </div>

                  {/* Quick Actions */}
                  <div style={{ display: 'flex', gap: spacing.md, flexWrap: 'wrap' }}>
                    <Button
                      variant="secondary"
                      size="md"
                      icon="👥"
                      onClick={() => setViewMode('byOwner')}
                    >
                      לפי אחראי
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      icon="📋"
                      onClick={() => setViewMode('rows')}
                    >
                      כל המשימות
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Two Column Layout: Action (Right) + Overview (Left) */}
              <style>{`
                @media (min-width: 1024px) {
                  .dashboard-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 32px;
                  }
                }
                @media (max-width: 1023px) {
                  .dashboard-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 32px;
                  }
                }
              `}</style>

              {/* Action Queue - Horizontal Cards */}
              <div style={{ marginBottom: spacing.xxxl }}>
                <div style={{ marginBottom: spacing.lg }}>
                  <h3 style={{ 
                    fontSize: typography.fontSize.h2, 
                    fontWeight: typography.fontWeight.bold, 
                    marginBottom: spacing.xxl, 
                    color: colors.text.primary, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: spacing.md,
                    fontFamily: typography.fontFamily,
                    letterSpacing: '-0.5px'
                  }}>
                    <span style={{ fontSize: '28px' }}>🎯</span>
                    <span>תור עבודה - לפי דחיפות</span>
                  </h3>
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: spacing.lg,
                  marginBottom: spacing.xxxl
                }}>
                  {/* Action Queue - sorted by urgency */}
                  {tasks.filter(t => t.progress < 100).sort(sortByUrgency).slice(0, 6).map(task => {
                    const priorityConfig = task.priority === 'P1' 
                      ? colors.priority.p1 
                      : task.priority === 'P2' 
                      ? colors.priority.p2 
                      : colors.priority.p3;
                    
                    return (
                    <Card
                      key={task.id}
                      variant="glass"
                      padding="lg"
                      hoverable
                      onClick={() => { setSelectedTask(task); setEditingTask(task); }}
                      style={{
                        background: `linear-gradient(135deg, ${priorityConfig.bg}20, rgba(255, 255, 255, 0.6))`,
                        borderTop: `4px solid ${priorityConfig.text}`,
                        boxShadow: priorityConfig.glow,
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                      }}
                    >
                      {/* Header Row: Category + Priority */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
                        <span style={{
                          fontSize: typography.fontSize.xs,
                          fontWeight: typography.fontWeight.bold,
                          color: task.color,
                          background: `${task.color}15`,
                          padding: `${spacing.xs} ${spacing.md}`,
                          borderRadius: radius.sm,
                          fontFamily: typography.fontFamily,
                          border: `1px solid ${task.color}30`
                        }}>
                          {task.category}
                        </span>
                        {getPriorityBadge(task.priority || 'P2', 'small')}
                      </div>

                      {/* Title */}
                      <div style={{ 
                        fontSize: typography.fontSize.lg, 
                        fontWeight: typography.fontWeight.bold, 
                        color: colors.text.primary, 
                        marginBottom: spacing.md,
                        fontFamily: typography.fontFamily,
                        lineHeight: typography.lineHeight.tight
                      }}>
                        {task.title}
                      </div>

                      {/* Meta Row: Owner + Due Date */}
                      <div style={{ 
                        display: 'flex', 
                        gap: spacing.md, 
                        fontSize: typography.fontSize.sm, 
                        color: colors.text.tertiary,
                        marginBottom: spacing.sm,
                        fontFamily: typography.fontFamily
                      }}>
                        <span>👤 {task.owner}</span>
                        {task.dueDate && <span>📅 {task.dueDate}</span>}
                      </div>
                      {/* Status Tags */}
                      <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap', marginBottom: spacing.sm }}>
                        {isOverdue(task) && (
                          <span style={{ 
                            background: colors.semantic.dangerLight, 
                            color: colors.semantic.danger, 
                            padding: `2px ${spacing.sm}`, 
                            borderRadius: '4px', 
                            fontSize: typography.fontSize.xs, 
                            fontWeight: typography.fontWeight.bold,
                            fontFamily: typography.fontFamily
                          }}>
                            ⚠️ איחור
                          </span>
                        )}
                        {hasBlocker(task) && (
                          <span style={{ 
                            background: colors.semantic.warningLight, 
                            color: colors.semantic.warning, 
                            padding: `2px ${spacing.sm}`, 
                            borderRadius: '4px', 
                            fontSize: typography.fontSize.xs, 
                            fontWeight: typography.fontWeight.bold,
                            fontFamily: typography.fontFamily
                          }}>
                            🚧 חסם
                          </span>
                        )}
                        {isUnassigned(task) && (
                          <span style={{ 
                            background: colors.semantic.infoLight, 
                            color: colors.semantic.info, 
                            padding: `2px ${spacing.sm}`, 
                            borderRadius: '4px', 
                            fontSize: typography.fontSize.xs, 
                            fontWeight: typography.fontWeight.bold,
                            fontFamily: typography.fontFamily
                          }}>
                            👤 ללא אחראי
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div style={{ 
                        width: '100%', 
                        height: '8px', 
                        background: 'rgba(226, 232, 240, 0.3)', 
                        borderRadius: radius.sm, 
                        overflow: 'hidden',
                        marginTop: spacing.md
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${task.progress}%`,
                          background: priorityConfig.gradient,
                          transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: `0 0 10px ${task.color}50`
                        }} />
                      </div>
                    </Card>
                    );
                  })}
                </div>
                </div>
              </div>

              {/* Categories Health - Horizontal Grid */}
              <div>
                  <h3 style={{ 
                    fontSize: typography.fontSize.h2, 
                    fontWeight: typography.fontWeight.bold, 
                    marginBottom: spacing.xxl, 
                    color: colors.text.primary, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: spacing.md,
                    fontFamily: typography.fontFamily,
                    letterSpacing: '-0.5px'
                  }}>
                    <span style={{ fontSize: '28px' }}>📊</span>
                    <span>בריאות לפי קטגוריה</span>
                  </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: spacing.lg
              }}>
              {categories
                .map(category => {
                  const categoryTasks = tasks.filter(t => t.category === category);
                  const p1Count = categoryTasks.filter(t => t.priority === 'P1').length;
                  const overdueCount = categoryTasks.filter(isOverdue).length;
                  const tasksWithRisks = categoryTasks.filter(t => t.risksBlockers && t.risksBlockers.trim()).length;
                  const noOwnerCount = categoryTasks.filter(isUnassigned).length;
                  const riskScore = p1Count * 3 + overdueCount * 2 + tasksWithRisks * 2 + noOwnerCount;
                  return { category, categoryTasks, riskScore };
                })
                .sort((a, b) => b.riskScore - a.riskScore)
                .map(({ category, categoryTasks }) => {
                const avgProgress = Math.round(categoryTasks.reduce((sum, t) => sum + t.progress, 0) / categoryTasks.length);
                const color = categoryTasks[0].color;
                const tasksWithKPI = categoryTasks.filter(t => t.kpiName && t.kpiName.trim()).length;
                const tasksWithRisks = categoryTasks.filter(t => t.risksBlockers && t.risksBlockers.trim()).length;
                const p1Count = categoryTasks.filter(t => t.priority === 'P1').length;
                const overdueCount = categoryTasks.filter(isOverdue).length;
                const noOwnerCount = categoryTasks.filter(isUnassigned).length;

                return (
                  <Card
                    key={category}
                    variant="glass"
                    padding="lg"
                    hoverable
                    style={{
                      borderTop: `3px solid ${color}`,
                      boxShadow: `0 4px 20px ${color}20`,
                    }}
                  >
                    {/* Header */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginBottom: spacing.lg,
                      paddingBottom: spacing.md,
                      borderBottom: `1px solid ${colors.border.light}`
                    }}>
                      <span style={{ 
                        fontSize: typography.fontSize.xl, 
                        fontWeight: typography.fontWeight.bold, 
                        color: colors.text.primary,
                        fontFamily: typography.fontFamily,
                        letterSpacing: '-0.5px'
                      }}>
                        {category}
                      </span>
                      <span style={{ 
                        fontSize: typography.fontSize.h2, 
                        fontWeight: typography.fontWeight.black, 
                        color,
                        fontFamily: typography.fontFamily,
                        letterSpacing: '-1px'
                      }}>
                        {avgProgress}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ 
                      background: 'rgba(226, 232, 240, 0.3)', 
                      height: '10px', 
                      borderRadius: radius.sm, 
                      overflow: 'hidden', 
                      marginBottom: spacing.lg,
                      backdropFilter: 'blur(4px)'
                    }}>
                      <div style={{
                        background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                        height: '100%',
                        width: `${avgProgress}%`,
                        transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: `0 0 10px ${color}40`
                      }} />
                    </div>

                    {/* Health Metrics */}
                    <div style={{ display: 'flex', gap: spacing.sm, fontSize: typography.fontSize.xs, flexWrap: 'wrap' }}>
                      <span style={{ 
                        fontWeight: typography.fontWeight.semibold, 
                        color: colors.text.secondary,
                        fontFamily: typography.fontFamily,
                        background: 'rgba(148, 163, 184, 0.1)',
                        padding: `${spacing.xs} ${spacing.md}`,
                        borderRadius: radius.sm
                      }}>
                        📋 {categoryTasks.length}
                      </span>
                      {p1Count > 0 && (
                        <span style={{ 
                          color: colors.semantic.danger, 
                          fontWeight: typography.fontWeight.bold, 
                          background: 'rgba(254, 226, 226, 0.4)', 
                          padding: `${spacing.xs} ${spacing.md}`, 
                          borderRadius: radius.sm,
                          fontFamily: typography.fontFamily,
                          border: `1px solid rgba(239, 68, 68, 0.2)`,
                          backdropFilter: 'blur(8px)'
                        }}>
                          🔴 {p1Count}
                        </span>
                      )}
                      {overdueCount > 0 && (
                        <span style={{ 
                          color: colors.semantic.warning, 
                          fontWeight: typography.fontWeight.bold, 
                          background: 'rgba(254, 243, 199, 0.4)', 
                          padding: `${spacing.xs} ${spacing.md}`, 
                          borderRadius: radius.sm,
                          fontFamily: typography.fontFamily,
                          border: `1px solid rgba(245, 158, 11, 0.2)`,
                          backdropFilter: 'blur(8px)'
                        }}>
                          ⚠️ {overdueCount}
                        </span>
                      )}
                      {tasksWithRisks > 0 && (
                        <span style={{ 
                          color: colors.semantic.warning, 
                          fontWeight: typography.fontWeight.bold, 
                          background: 'rgba(254, 243, 199, 0.4)', 
                          padding: `${spacing.xs} ${spacing.md}`, 
                          borderRadius: radius.sm,
                          fontFamily: typography.fontFamily,
                          border: `1px solid rgba(245, 158, 11, 0.2)`,
                          backdropFilter: 'blur(8px)'
                        }}>
                          🚧 {tasksWithRisks}
                        </span>
                      )}
                      {noOwnerCount > 0 && (
                        <span style={{ 
                          color: colors.brand.primary, 
                          fontWeight: typography.fontWeight.bold, 
                          background: 'rgba(219, 234, 254, 0.4)', 
                          padding: `${spacing.xs} ${spacing.md}`, 
                          borderRadius: radius.sm,
                          fontFamily: typography.fontFamily,
                          border: `1px solid rgba(59, 130, 246, 0.2)`,
                          backdropFilter: 'blur(8px)'
                        }}>
                          👤 {noOwnerCount}
                        </span>
                      )}
                      {tasksWithKPI > 0 && (
                        <span style={{ 
                          color: colors.semantic.success, 
                          fontWeight: typography.fontWeight.semibold,
                          fontFamily: typography.fontFamily,
                          background: 'rgba(220, 252, 231, 0.3)',
                          padding: `${spacing.xs} ${spacing.md}`,
                          borderRadius: radius.sm,
                          border: `1px solid rgba(34, 197, 94, 0.2)`,
                          backdropFilter: 'blur(8px)'
                        }}>
                          📊 {tasksWithKPI}
                        </span>
                      )}
                    </div>
                  </Card>
                );
                })}
                </div>
              </div>

              {/* Critical Tasks - Full Width Below */}
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '40px', marginBottom: '20px', color: '#171717' }}>
                🔴 משימות דורשות תשומת לב
              </h3>
              <div style={{ marginBottom: '40px' }}>
                {tasks.filter(t => 
                  (t.dueDate && new Date(t.dueDate) < new Date()) ||
                  !t.owner || t.owner === 'ללא אחראי' ||
                  (t.risksBlockers && t.risksBlockers.trim())
                ).length === 0 ? (
                  <div style={{ 
                    padding: '24px', 
                    background: '#dcfce7', 
                    borderRadius: '12px',
                    textAlign: 'center',
                    border: '1px solid #bbf7d0'
                  }}>
                    <span style={{ fontSize: '20px', marginBottom: '8px', display: 'block' }}>🎉</span>
                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#15803d' }}>
                      אין משימות קריטיות כרגע - כל הכבוד!
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date()).map(task => (
                      <div key={task.id} style={{
                        padding: '16px',
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: '600', color: '#991b1b', marginBottom: '4px' }}>
                            ⏰ {task.title}
                          </div>
                          <div style={{ fontSize: '13px', color: '#7f1d1d' }}>
                            תאריך יעד: {task.dueDate} | אחראי: {task.owner}
                          </div>
                        </div>
                        <button
                          onClick={() => { setSelectedTask(task); setEditingTask(task); setViewMode('rows'); }}
                          style={{
                            padding: '8px 16px',
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          פתח
                        </button>
                      </div>
                    ))}
                    {tasks.filter(t => !t.owner || t.owner === 'ללא אחראי').map(task => (
                      <div key={task.id} style={{
                        padding: '16px',
                        background: '#fef3c7',
                        border: '1px solid #fde68a',
                        borderRadius: '10px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: '600', color: '#b45309', marginBottom: '4px' }}>
                            👤 {task.title}
                          </div>
                          <div style={{ fontSize: '13px', color: '#78350f' }}>
                            משימה ללא אחראי מוגדר
                          </div>
                        </div>
                        <button
                          onClick={() => { setSelectedTask(task); setEditingTask(task); setViewMode('rows'); }}
                          style={{
                            padding: '8px 16px',
                            background: '#f59e0b',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          הוסף אחראי
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Contributors */}
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '40px', marginBottom: '20px', color: '#171717' }}>
                👥 אחראים בולטים
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                {[...new Set(tasks.map(t => t.owner))].map(owner => {
                  const ownerTasks = tasks.filter(t => t.owner === owner);
                  const avgProgress = Math.round(ownerTasks.reduce((sum, t) => sum + t.progress, 0) / ownerTasks.length);
                  
                  return (
                    <div key={owner} style={{
                      padding: '16px',
                      border: '1px solid #e5e5e5',
                      borderRadius: '8px',
                      background: '#fafafa'
                    }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#171717' }}>
                        👤 {owner}
                      </div>
                      <div style={{ fontSize: '14px', color: '#737373', marginBottom: '8px' }}>
                        {ownerTasks.length} משימות | {avgProgress}% ממוצע
                      </div>
                      <div style={{ background: '#e5e5e5', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          background: avgProgress >= 50 ? '#22c55e' : '#f59e0b',
                          height: '100%',
                          width: `${avgProgress}%`
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rows View - Task List with Expandable Details */}
          {viewMode === 'rows' && (
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
                  <span style={{ fontSize: '16px' }}>➕</span>
                  <span>קטגוריה חדשה</span>
                </button>
              </div>

              {/* Search & Filter Toggle */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="🔍 חיפוש משימות..."
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
                  <span style={{ fontSize: '16px' }}>🔍</span>
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
                    🔍 פילטרים
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
                          👤 {owner} {isSelected && '✓'}
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
                    🗑️ נקה פילטרים
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
                              🎨
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
                              🗑️
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
                                <span style={{ fontSize: '16px' }}>👤</span>
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
                                <span style={{ fontSize: '16px' }}>🎯</span>
                                <span>{task.milestones.filter(m => m.done).length}/{task.milestones.length}</span>
                              </div>

                              {/* Quick Actions */}
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTask(task);
                                    setEditingTask(task);
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
                                    📝 תיאור
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
                                      🏥 אפיון תהליך
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
                                      📊 מדד הצלחה
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
                                      📅 תאריכים ובעלי עניין
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
                                      ⚠️ סיכונים ותלויות
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
                                    🎯 מיילסטונים
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
                                          {m.done ? '✅' : '⭕'}
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
          {viewMode === 'tree' && renderTreeDiagram('full')}

          {/* By Owner View */}
          {viewMode === 'byOwner' && (
            <div>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#171717', marginBottom: '32px', textAlign: 'center' }}>
                👥 משימות לפי אחראי
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {owners.map(owner => {
                  const ownerTasks = tasks.filter(t => t.owner === owner).sort(sortByPriority);
                  const avgProgress = ownerTasks.length > 0 
                    ? Math.round(ownerTasks.reduce((sum, t) => sum + t.progress, 0) / ownerTasks.length) 
                    : 0;
                  const completedTasks = ownerTasks.filter(t => t.progress === 100).length;
                  const p1Tasks = ownerTasks.filter(t => t.priority === 'P1').length;
                  const tasksWithKpi = ownerTasks.filter(t => hasKpi(t)).length;
                  const overdueCount = ownerTasks.filter(t => isOverdue(t)).length;
                  const blockerCount = ownerTasks.filter(t => hasBlocker(t)).length;

                  return (
                    <div key={owner} style={{
                      background: 'white',
                      border: '2px solid #e5e5e5',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
                    }}>
                      {/* Owner Header */}
                      <div style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        padding: '24px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '16px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '28px' }}>👤</span>
                          <div>
                            <h3 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                              {owner}
                            </h3>
                            <p style={{ fontSize: '13px', opacity: 0.9, margin: '4px 0 0 0' }}>
                              {ownerTasks.length} משימות | התקדמות ממוצעת {avgProgress}%
                            </p>
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                          <div style={{ 
                            background: 'rgba(255,255,255,0.2)', 
                            padding: '8px 16px', 
                            borderRadius: '10px',
                            backdropFilter: 'blur(10px)'
                          }}>
                            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{completedTasks}</div>
                            <div style={{ fontSize: '11px', opacity: 0.9 }}>הושלמו</div>
                          </div>
                          {p1Tasks > 0 && (
                            <div style={{ 
                              background: 'rgba(239,68,68,0.3)', 
                              padding: '8px 16px', 
                              borderRadius: '10px',
                              backdropFilter: 'blur(10px)'
                            }}>
                              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>🔴 {p1Tasks}</div>
                              <div style={{ fontSize: '11px', opacity: 0.9 }}>דחופות</div>
                            </div>
                          )}
                          {overdueCount > 0 && (
                            <div style={{ 
                              background: 'rgba(239,68,68,0.3)', 
                              padding: '8px 16px', 
                              borderRadius: '10px',
                              backdropFilter: 'blur(10px)'
                            }}>
                              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>⚠️ {overdueCount}</div>
                              <div style={{ fontSize: '11px', opacity: 0.9 }}>איחור</div>
                            </div>
                          )}
                          {blockerCount > 0 && (
                            <div style={{ 
                              background: 'rgba(245,158,11,0.3)', 
                              padding: '8px 16px', 
                              borderRadius: '10px',
                              backdropFilter: 'blur(10px)'
                            }}>
                              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>🚧 {blockerCount}</div>
                              <div style={{ fontSize: '11px', opacity: 0.9 }}>חסמים</div>
                            </div>
                          )}
                          <div style={{ 
                            background: 'rgba(255,255,255,0.2)', 
                            padding: '8px 16px', 
                            borderRadius: '10px',
                            backdropFilter: 'blur(10px)'
                          }}>
                            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>📊 {tasksWithKpi}</div>
                            <div style={{ fontSize: '11px', opacity: 0.9 }}>עם KPI</div>
                          </div>
                        </div>
                      </div>

                      {/* Tasks List */}
                      <div style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {ownerTasks.map(task => (
                            <div
                              key={task.id}
                              onClick={() => { setSelectedTask(task); setEditingTask(task); }}
                              style={{
                                background: 'white',
                                border: `2px solid ${task.color}30`,
                                borderRight: `4px solid ${task.color}`,
                                borderRadius: '12px',
                                padding: '16px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e: any) => {
                                e.currentTarget.style.transform = 'translateX(-4px)';
                                e.currentTarget.style.boxShadow = `0 4px 16px ${task.color}30`;
                              }}
                              onMouseLeave={(e: any) => {
                                e.currentTarget.style.transform = 'translateX(0)';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                    <span style={{
                                      background: `linear-gradient(135deg, ${task.color}20, ${task.color}10)`,
                                      color: task.color,
                                      padding: '4px 10px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      border: `1px solid ${task.color}30`
                                    }}>
                                      {task.category}
                                    </span>
                                    {getPriorityBadge(task.priority || 'P2', 'small')}
                                  </div>
                                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#171717', marginBottom: '8px' }}>
                                    {task.title}
                                  </div>
                                  {task.description && (
                                    <div style={{ fontSize: '13px', color: '#737373', lineHeight: '1.5' }}>
                                      {task.description.substring(0, 120)}...
                                    </div>
                                  )}
                                </div>
                                <div style={{ textAlign: 'left', minWidth: '60px' }}>
                                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: task.color }}>
                                    {task.progress}%
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#737373', marginTop: '4px' }}>
                                    🎯 {task.milestones.filter(m => m.done).length}/{task.milestones.length}
                                  </div>
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div style={{ background: '#f5f5f5', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{
                                  background: `linear-gradient(90deg, ${task.color}, ${task.color}dd)`,
                                  height: '100%',
                                  width: `${task.progress}%`,
                                  transition: 'width 0.3s'
                                }} />
                              </div>

                              {/* Tags */}
                              {(isOverdue(task) || hasBlocker(task) || task.dueDate) && (
                                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', fontSize: '11px', flexWrap: 'wrap' }}>
                                  {isOverdue(task) && (
                                    <span style={{ background: '#fee2e2', color: '#dc2626', padding: '4px 8px', borderRadius: '6px', fontWeight: '700' }}>
                                      ⚠️ איחור
                                    </span>
                                  )}
                                  {hasBlocker(task) && (
                                    <span style={{ background: '#fed7aa', color: '#ea580c', padding: '4px 8px', borderRadius: '6px', fontWeight: '700' }}>
                                      🚧 חסם
                                    </span>
                                  )}
                                  {task.dueDate && !isOverdue(task) && (
                                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '6px', fontWeight: '600' }}>
                                      📅 יעד: {task.dueDate}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
      </main>

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
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>✏️ עריכת משימה</h2>
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

            <div style={{ padding: '24px' }}>
              <div style={{
                background: editingTask.color + '20',
                color: editingTask.color,
                display: 'inline-block',
                padding: '6px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                marginBottom: '20px',
                fontWeight: '500'
              }}>
                {editingTask.category}
              </div>

              {/* Title Input */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '8px' }}>
                  כותרת
                </label>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
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

              {/* Description Input */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '8px' }}>
                  תיאור
                </label>
                <textarea
                  value={editingTask.description}
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
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

              {/* Owner Input */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#525252', marginBottom: '8px' }}>
                  אחראי
                </label>
                <input
                  type="text"
                  value={editingTask.owner}
                  onChange={(e) => setEditingTask({ ...editingTask, owner: e.target.value })}
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

              {/* Priority Selector */}
              <div style={{ marginBottom: '24px' }}>
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
                          fontWeight: isSelected ? '700' : '600',
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
                        {priority === 'P1' && '🔴 P1 - דחוף'}
                        {priority === 'P2' && '🟠 P2 - בינוני'}
                        {priority === 'P3' && '🔵 P3 - נמוך'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Advanced Fields - Process Definition */}
              <div style={{ 
                marginBottom: '24px', 
                padding: '16px', 
                background: '#f8fafc', 
                borderRadius: '10px',
                border: '1px solid #e5e5e5'
              }}>
                <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#171717', marginBottom: '16px' }}>
                  🏥 אפיון תהליך
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                      מחלקה
                    </label>
                    <input
                      type="text"
                      value={editingTask.department || ''}
                      onChange={(e) => setEditingTask({ ...editingTask, department: e.target.value })}
                      placeholder="לדוגמא: הנהלה"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e5e5e5',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        background: 'white'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                      שם תהליך
                    </label>
                    <input
                      type="text"
                      value={editingTask.processName || ''}
                      onChange={(e) => setEditingTask({ ...editingTask, processName: e.target.value })}
                      placeholder="לדוגמא: תכנון אסטרטגי"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e5e5e5',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        background: 'white'
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                    הגדרת הבעיה
                  </label>
                  <textarea
                    value={editingTask.problemStatement || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, problemStatement: e.target.value })}
                    placeholder="מה הבעיה או נקודת הכאב הנוכחית?"
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e5e5e5',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      background: 'white'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                    מטרה
                  </label>
                  <input
                    type="text"
                    value={editingTask.goal || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, goal: e.target.value })}
                    placeholder="מה המטרה המדידה?"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e5e5e5',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      background: 'white'
                    }}
                  />
                </div>
              </div>

              {/* KPI Section */}
              <div style={{ 
                marginBottom: '24px', 
                padding: '16px', 
                background: '#f0f9ff', 
                borderRadius: '10px',
                border: '1px solid #bae6fd'
              }}>
                <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#171717', marginBottom: '16px' }}>
                  📊 מדד הצלחה (KPI)
                </h4>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                    שם המדד
                  </label>
                  <input
                    type="text"
                    value={editingTask.kpiName || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, kpiName: e.target.value })}
                    placeholder="לדוגמא: מספר משתתפים מוסמכים"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e5e5e5',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      background: 'white'
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                      Baseline
                    </label>
                    <input
                      type="text"
                      value={editingTask.baseline || ''}
                      onChange={(e) => setEditingTask({ ...editingTask, baseline: e.target.value })}
                      placeholder="נקודת התחלה"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e5e5e5',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        background: 'white'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                      Target
                    </label>
                    <input
                      type="text"
                      value={editingTask.target || ''}
                      onChange={(e) => setEditingTask({ ...editingTask, target: e.target.value })}
                      placeholder="יעד"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e5e5e5',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        background: 'white'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                      תדירות מדידה
                    </label>
                    <input
                      type="text"
                      value={editingTask.measurementCadence || ''}
                      onChange={(e) => setEditingTask({ ...editingTask, measurementCadence: e.target.value })}
                      placeholder="שבועי/חודשי"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e5e5e5',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        background: 'white'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Dates & Stakeholders */}
              <div style={{ 
                marginBottom: spacing.xl, 
                padding: spacing.lg, 
                background: `linear-gradient(135deg, ${colors.semantic.dangerLight}20, ${colors.semantic.warningLight}20)`, 
                borderRadius: radius.lg,
                border: `1px solid ${colors.border.light}`
              }}>
                <h4 style={{ 
                  fontSize: typography.fontSize.md, 
                  fontWeight: typography.fontWeight.bold, 
                  color: colors.text.primary, 
                  fontFamily: typography.fontFamily,
                  marginBottom: spacing.lg 
                }}>
                  📅 תאריכים ובעלי עניין
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                      תאריך התחלה
                    </label>
                    <input
                      type="date"
                      value={editingTask.startDate || ''}
                      onChange={(e) => setEditingTask({ ...editingTask, startDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e5e5e5',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        background: 'white'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                      תאריך יעד
                    </label>
                    <input
                      type="date"
                      value={editingTask.dueDate || ''}
                      onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e5e5e5',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        background: 'white'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
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
                      padding: '10px',
                      border: '1px solid #e5e5e5',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      background: 'white'
                    }}
                  />
                </div>
              </div>

              {/* Risks & Dependencies */}
              <div style={{ 
                marginBottom: '24px', 
                padding: '16px', 
                background: '#fffbeb', 
                borderRadius: '10px',
                border: '1px solid #fef3c7'
              }}>
                <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#171717', marginBottom: '16px' }}>
                  ⚠️ סיכונים ותלויות
                </h4>
                
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                    סיכונים וחסמים
                  </label>
                  <textarea
                    value={editingTask.risksBlockers || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, risksBlockers: e.target.value })}
                    placeholder="רשום סיכונים ידועים וחסמים פוטנציאליים"
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e5e5e5',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      background: 'white'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                    תלויות במשימות אחרות
                  </label>
                  <input
                    type="text"
                    value={editingTask.dependencies || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, dependencies: e.target.value })}
                    placeholder="לדוגמא: תלוי במשימה #1"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e5e5e5',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      background: 'white'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#525252', marginBottom: '6px' }}>
                    קישורים ומסמכים
                  </label>
                  <input
                    type="text"
                    value={editingTask.links || ''}
                    onChange={(e) => setEditingTask({ ...editingTask, links: e.target.value })}
                    placeholder="URL למסמכים, דרייב, וכו׳"
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #e5e5e5',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      background: 'white'
                    }}
                  />
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveTask}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#0ea5e9',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '24px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#0284c7'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#0ea5e9'}
              >
                💾 שמור שינויים
              </button>

              {/* Progress Section */}
              <div style={{ marginBottom: '32px', padding: '20px', background: '#fafafa', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#171717' }}>
                  📊 התקדמות
                </h4>
                <div style={{ background: '#e5e5e5', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{
                    background: editingTask.progress >= 80 ? '#22c55e' : '#0ea5e9',
                    height: '100%',
                    width: `${editingTask.progress}%`,
                    transition: 'width 0.3s'
                  }} />
                </div>
                <div style={{ textAlign: 'center', fontSize: '14px', color: '#525252' }}>
                  {editingTask.progress}% הושלמו ({editingTask.milestones.filter(m => m.done).length}/{editingTask.milestones.length} מיילסטונים)
                </div>
              </div>

              {/* Milestones Section */}
              <div>
                <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#171717' }}>
                  🎯 מיילסטונים
                </h4>
                {editingTask.milestones.map((milestone, i) => (
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
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: `2px solid ${milestone.done ? '#22c55e' : '#d4d4d4'}`,
                        background: milestone.done ? '#22c55e' : 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '14px',
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
                        padding: '4px 8px',
                        background: '#fee2e2',
                        color: '#991b1b',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#fecaca'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#fee2e2'}
                    >
                      🗑️
                    </button>
                  </div>
                ))}

                {/* Add New Milestone */}
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={newMilestone}
                    onChange={(e) => setNewMilestone(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addMilestone()}
                    placeholder="➕ מיילסטון חדש..."
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: '1px solid #e5e5e5',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontFamily: 'inherit'
                    }}
                  />
                  <button
                    onClick={addMilestone}
                    disabled={!newMilestone.trim()}
                    style={{
                      padding: '10px 16px',
                      background: newMilestone.trim() ? '#22c55e' : '#e5e5e5',
                      color: newMilestone.trim() ? 'white' : '#a3a3a3',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: newMilestone.trim() ? 'pointer' : 'not-allowed',
                      fontSize: '14px',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                  >
                    ➕
                  </button>
                </div>

                <div style={{ fontSize: '12px', color: '#737373', marginTop: '12px', textAlign: 'center' }}>
                  💡 לחץ על עיגול לסימון מיילסטון כהושלם
                </div>
              </div>

              {/* Delete Task Button */}
              <button
                onClick={() => deleteTask(editingTask.id)}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: '#fee2e2',
                  color: '#991b1b',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginTop: '24px',
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
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>➕ משימה חדשה</h2>
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
                  alert('❌ יש למלא כותרת וקטגוריה');
                  return;
                }

                const stakeholdersText = (formData.get('stakeholders') as string || '').split(',').map(s => s.trim()).filter(s => s);

                const newTask = {
                  id: Math.max(...tasks.map(t => t.id)) + 1,
                  title: formData.get('title') as string,
                  description: formData.get('description') as string || '',
                  category: formData.get('category') as string,
                  color: tasks.find(t => t.category === formData.get('category'))?.color || '#7dd3fc',
                  owner: formData.get('owner') as string || 'ללא אחראי',
                  priority: formData.get('priority') as string || 'P2',
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
                  milestones: milestonesText.length > 0 ? milestonesText.map(text => ({ text, done: false })) : [{ text: 'שלב ראשון', done: false }]
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
                  <option value="P1">🔴 P1 - דחוף</option>
                  <option value="P2">🟠 P2 - בינוני</option>
                  <option value="P3">🔵 P3 - נמוך</option>
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
                  ✅ צור משימה
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
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#171717', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⚡</span>
                  <span>פעולות כלליות</span>
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
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#171717', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🧭</span>
                  <span>ניווט</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { keys: ['1'], desc: 'דשבורד', icon: '📊' },
                    { keys: ['2'], desc: 'משימות', icon: '📋' },
                    { keys: ['3'], desc: 'לפי אחראי', icon: '👥' },
                    { keys: ['4'], desc: 'דיאגרמה', icon: '🌳' }
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
                        <span style={{ marginLeft: '8px' }}>{item.icon}</span>
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
                  💡 <strong>טיפ:</strong> לחץ על <kbd style={{
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
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>➕ קטגוריה חדשה</h2>
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
                  ✅ צור קטגוריה
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
    </div>
  );
}

export default App;
