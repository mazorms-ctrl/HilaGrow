import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TasksView } from '@/components/tasks/TasksView';
import { BoardView } from '@/components/board/BoardView';
import { TreeView } from '@/components/tree/TreeView';
import { TaskDrawer } from '@/components/tasks/TaskDrawer';
import { useUIStore } from '@/store/uiStore';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function App() {
  const { viewMode, setViewMode } = useUIStore();

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-neutral-50">
        {/* Header */}
        <header className="border-b border-neutral-200 bg-white shadow-soft">
          <div className="mx-auto flex h-16 max-w-[1920px] items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold text-neutral-900">
                GROW - מחזור ב מובילים שינוי
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'cards' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                משימות
              </Button>
              <Button
                variant={viewMode === 'board' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('board')}
              >
                לוח
              </Button>
              <Button
                variant={viewMode === 'tree' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode('tree')}
              >
                דיאגרמה
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="mx-auto max-w-[1920px] p-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-8 shadow-soft">
            {viewMode === 'cards' && <TasksView />}
            {viewMode === 'board' && <BoardView />}
            {viewMode === 'tree' && <TreeView />}
          </div>
        </main>

        {/* Task Drawer */}
        <TaskDrawer />
      </div>
    </ErrorBoundary>
  );
}

export default App;
