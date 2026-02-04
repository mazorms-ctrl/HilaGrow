import { cn } from '@/lib/utils';
import { Badge } from './Badge';
import { OwnerPill } from './OwnerPill';
import { ProgressBar } from './ProgressBar';
import { ChevronDown, Pencil } from 'lucide-react';
import { useState } from 'react';

interface WorkItemRowProps {
  title: string;
  priority: 'P1' | 'P2' | 'P3';
  category?: {
    label: string;
    variant: 'purple' | 'blue' | 'green';
  };
  /**
   * Optional accent color (usually the category color).
   * When provided, the row gets a right-side color strip (RTL),
   * and the category pill is tinted using this color.
   */
  accentColor?: string;
  owner?: string;
  progress: {
    current: number;
    total: number;
    openCount?: number;
  };
  nextStep?: string;
  milestones?: Array<{
    text?: string;
    title?: string;
    done?: boolean;
  }>;
  onClick?: () => void;
  onEdit?: () => void;
  className?: string;
  // Additional fields for expanded view
  description?: string;
  department?: string;
  processName?: string;
  problemStatement?: string;
  goal?: string;
  kpiName?: string;
  baseline?: string;
  target?: string;
  measurementCadence?: string;
  startDate?: string;
  dueDate?: string;
  stakeholders?: string[];
  risksBlockers?: string;
  dependencies?: string;
  links?: string;
}

export function WorkItemRow({
  title,
  priority,
  category,
  accentColor,
  owner,
  progress,
  nextStep,
  milestones,
  onClick,
  onEdit,
  className,
  description,
  department,
  processName,
  problemStatement,
  goal,
  kpiName,
  baseline,
  target,
  measurementCadence,
  startDate,
  dueDate,
  stakeholders,
  risksBlockers,
  dependencies,
  links,
}: WorkItemRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hexToRgba = (hex: string, alpha: number) => {
    const normalized = hex.trim();
    const match = /^#?([a-fA-F0-9]{6})$/.exec(normalized);
    if (!match) return `rgba(0,0,0,${alpha})`;
    const value = match[1];
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  // Determine row background based on priority
  const priorityBg = {
    // Match `Badge` colors, but with low opacity on the card
    P1: 'bg-[rgba(239,68,68,0.08)] border-[rgba(239,68,68,0.32)]',
    P2: 'bg-[rgba(234,88,12,0.08)] border-[rgba(234,88,12,0.28)]',
    P3: 'bg-[rgba(2,132,199,0.08)] border-[rgba(2,132,199,0.28)]',
  };

  // Determine progress variant
  const getProgressVariant = () => {
    const percentage = (progress.current / progress.total) * 100;
    if (percentage === 100) return 'success';
    if (percentage >= 75) return 'primary';
    if (percentage >= 50) return 'warning';
    return 'danger';
  };

  const categoryVariants = {
    purple: 'bg-[#EDE9FE] text-[#7C3AED] border-[rgba(124,58,237,0.15)]',
    blue: 'bg-[#DBEAFE] text-[#2563EB] border-[rgba(37,99,235,0.15)]',
    green: 'bg-[#DCFCE7] text-[#16A34A] border-[rgba(22,163,74,0.15)]',
  };

  const milestonesDoneCount = milestones?.filter((m) => m.done).length ?? 0;

  // Helper to parse and render links safely
  const renderLinks = (linksString: string) => {
    const linkList = linksString.split(/[,\n]/).map(l => l.trim()).filter(Boolean);
    return linkList.map((link, idx) => (
      <a
        key={idx}
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-700 underline text-sm break-all"
      >
        {link}
      </a>
    ));
  };

  return (
    <div
      className={cn(
        'group relative flex flex-col min-h-[72px] gap-1.5 rounded-md border px-4 py-3 transition-all duration-200',
        !accentColor && priorityBg[priority],
        !isExpanded && 'hover:-translate-y-0.5 hover:shadow-hover',
        className
      )}
      style={
        accentColor
          ? {
              borderRightWidth: '4px',
              borderRightStyle: 'solid',
              borderRightColor: accentColor,
              backgroundColor: hexToRgba(accentColor, 0.06),
              borderColor: hexToRgba(accentColor, 0.32),
            }
          : undefined
      }
      dir="rtl"
    >
      {/* First row (matches screenshot): right content + left progress cluster */}
      <div 
        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 cursor-pointer" 
        dir="rtl"
        onClick={onClick}
      >
        {/* Right side: P1 + title + category + owner */}
        <div className="flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-3 min-w-0 w-full md:w-auto">
          <Badge variant={priority}>{priority}</Badge>

          <h3
            className="text-[16px] font-[Rubik] font-medium text-neutral-900 hover:text-neutral-700 text-right truncate"
            title={title}
          >
            {title}
          </h3>

          {category && (
            <span
              className={cn(
                'inline-flex h-[22px] items-center rounded-[6px] border px-2.5 py-0.5 text-xs font-[Rubik] font-bold flex-shrink-0',
                !accentColor && categoryVariants[category.variant]
              )}
              style={
                accentColor
                  ? {
                      backgroundColor: hexToRgba(accentColor, 0.12),
                      borderColor: hexToRgba(accentColor, 0.28),
                      color: accentColor,
                    }
                  : undefined
              }
            >
              {category.label}
            </span>
          )}

          {owner && <OwnerPill name={owner} className="flex-shrink-0 hidden sm:flex" />}
        </div>

        {/* Left side: chevron + 0/3 + bar + "3 פתוחות" */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 w-full md:w-auto justify-end" dir="ltr">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="flex h-7 w-7 items-center justify-center rounded-sm text-neutral-900/45 transition-colors hover:bg-neutral-900/4 active:bg-neutral-900/6"
              aria-label="ערוך משימה"
              title="ערוך משימה"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-sm text-neutral-900/45 transition-colors hover:bg-neutral-900/4 active:bg-neutral-900/6"
            aria-label={isExpanded ? 'סגור' : 'פתח פרטים'}
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                isExpanded && 'rotate-180'
              )}
            />
          </button>

          <span className="text-sm font-semibold text-neutral-600 tabular-nums" dir="ltr">
            {progress.current}/{progress.total}
          </span>

          <div className="w-[100px] md:w-[160px]">
            <ProgressBar
              value={progress.current}
              max={progress.total}
              variant={getProgressVariant()}
              className="h-2.5"
            />
          </div>
        </div>
      </div>

      {/* Second Row - Next Step */}
      {(nextStep || (milestones && milestones.length > 0)) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-right text-xs font-medium text-neutral-500">
          {nextStep && (
            <>
              <span className="min-w-0 break-words">{nextStep}</span>
            </>
          )}

          {milestones && milestones.length > 0 && (
            <>
              {nextStep && <span className="mx-1 text-neutral-300">|</span>}

              <span className="text-neutral-400 whitespace-nowrap">אבני דרך:</span>
              <span className="tabular-nums whitespace-nowrap">
                {milestonesDoneCount}/{milestones.length}
              </span>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                {milestones.slice(0, 3).map((m, i) => {
                  const label = m.title ?? m.text ?? '';
                  return (
                    <span
                      key={`${label}-${i}`}
                      title={label}
                      className={cn(
                        'whitespace-nowrap font-[Rubik] border border-[rgba(198,201,205,1)] bg-white px-px py-0.5 rounded-[3px] text-center',
                        m.done ? 'text-neutral-400 line-through' : 'text-neutral-600'
                      )}
                    >
                      {label}
                    </span>
                  );
                })}
                {milestones.length > 3 && (
                  <span className="text-neutral-400 tabular-nums whitespace-nowrap">
                    +{milestones.length - 3}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Full Details Accordion */}
      {isExpanded && (
        <div
          className="mt-3 rounded-lg border border-neutral-900/10 bg-gradient-to-br from-white to-neutral-50 p-4 space-y-2"
          dir="rtl"
        >
          <style>{`
            details > summary {
              list-style: none;
              cursor: pointer;
              user-select: none;
            }
            details > summary::-webkit-details-marker {
              display: none;
            }
            details[open] > summary .chevron {
              transform: rotate(180deg);
            }
          `}</style>

          {/* Section: יסודות (Basics) */}
          <details open className="bg-white border border-neutral-200 rounded-lg">
            <summary className="px-4 py-3 font-semibold text-sm text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center justify-between">
              <span>📌 יסודות</span>
              <ChevronDown className="h-4 w-4 transition-transform chevron text-neutral-400" />
            </summary>
            <div className="px-4 pb-3 pt-2 space-y-2 text-sm text-right">
              {description && (
                <div>
                  <span className="font-semibold text-neutral-600">תיאור: </span>
                  <span className="text-neutral-700">{description}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="font-semibold text-neutral-600">דחיפות: </span>
                  <Badge variant={priority}>{priority}</Badge>
                </div>
                <div>
                  <span className="font-semibold text-neutral-600">אחראי: </span>
                  <span className="text-neutral-700">{owner}</span>
                </div>
              </div>
              <div>
                <span className="font-semibold text-neutral-600">התקדמות: </span>
                <span className="text-neutral-700">
                  {progress.current}/{progress.total} ({Math.round((progress.current / progress.total) * 100)}%)
                </span>
              </div>
            </div>
          </details>

          {/* Section: אפיון (Definition) */}
          <details open={!!(department || processName || problemStatement || goal)} className="bg-white border border-neutral-200 rounded-lg">
            <summary className="px-4 py-3 font-semibold text-sm text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center justify-between">
              <span>🏥 אפיון הפרויקט</span>
              <ChevronDown className="h-4 w-4 transition-transform chevron text-neutral-400" />
            </summary>
            <div className="px-4 pb-3 pt-2 space-y-2 text-sm text-right">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="font-semibold text-neutral-600">מחלקה: </span>
                  <span className="text-neutral-700">{department || <span className="text-neutral-400">לא הוגדר</span>}</span>
                </div>
                <div>
                  <span className="font-semibold text-neutral-600">תהליך: </span>
                  <span className="text-neutral-700">{processName || <span className="text-neutral-400">לא הוגדר</span>}</span>
                </div>
              </div>
              {problemStatement && (
                <div>
                  <span className="font-semibold text-neutral-600">בעיה מזוהה: </span>
                  <span className="text-neutral-700">{problemStatement}</span>
                </div>
              )}
              {(goal || nextStep) && (
                <div>
                  <span className="font-semibold text-neutral-600">מטרה: </span>
                  <span className="text-blue-600 font-medium">{goal || nextStep}</span>
                </div>
              )}
            </div>
          </details>

          {/* Section: KPI */}
          <details open={!!(kpiName || baseline || target)} className="bg-white border border-neutral-200 rounded-lg">
            <summary className="px-4 py-3 font-semibold text-sm text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center justify-between">
              <span>📊 מדדי הצלחה (KPI)</span>
              <ChevronDown className="h-4 w-4 transition-transform chevron text-neutral-400" />
            </summary>
            <div className="px-4 pb-3 pt-2 space-y-2 text-sm text-right">
              {kpiName && (
                <div>
                  <span className="font-semibold text-neutral-600">שם המדד: </span>
                  <span className="text-neutral-700">{kpiName}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="font-semibold text-neutral-600">Baseline: </span>
                  <span className="text-neutral-700">{baseline || <span className="text-neutral-400">לא הוגדר</span>}</span>
                </div>
                <div>
                  <span className="font-semibold text-neutral-600">Target: </span>
                  <span className="text-neutral-700">{target || <span className="text-neutral-400">לא הוגדר</span>}</span>
                </div>
              </div>
              {measurementCadence && (
                <div>
                  <span className="font-semibold text-neutral-600">תדירות מדידה: </span>
                  <span className="text-neutral-700">{measurementCadence}</span>
                </div>
              )}
            </div>
          </details>

          {/* Section: Timeline & Stakeholders */}
          <details open={!!(startDate || dueDate || (stakeholders && stakeholders.length > 0))} className="bg-white border border-neutral-200 rounded-lg">
            <summary className="px-4 py-3 font-semibold text-sm text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center justify-between">
              <span>📅 ציר זמן ובעלי עניין</span>
              <ChevronDown className="h-4 w-4 transition-transform chevron text-neutral-400" />
            </summary>
            <div className="px-4 pb-3 pt-2 space-y-2 text-sm text-right">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="font-semibold text-neutral-600">התחלה: </span>
                  <span className="text-neutral-700">{startDate || <span className="text-neutral-400">לא הוגדר</span>}</span>
                </div>
                <div>
                  <span className="font-semibold text-neutral-600">יעד: </span>
                  <span className="text-orange-600 font-semibold">{dueDate || <span className="text-neutral-400">לא הוגדר</span>}</span>
                </div>
              </div>
              {stakeholders && stakeholders.length > 0 && (
                <div>
                  <span className="font-semibold text-neutral-600">בעלי עניין: </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {stakeholders.map((stakeholder, i) => (
                      <span
                        key={i}
                        className="inline-block px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-md border border-blue-200"
                      >
                        {stakeholder}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </details>

          {/* Section: Risks & Dependencies */}
          <details open={!!(risksBlockers || dependencies)} className="bg-white border border-neutral-200 rounded-lg">
            <summary className="px-4 py-3 font-semibold text-sm text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center justify-between">
              <span>⚠️ סיכונים ותלויות</span>
              <ChevronDown className="h-4 w-4 transition-transform chevron text-neutral-400" />
            </summary>
            <div className="px-4 pb-3 pt-2 space-y-2 text-sm text-right">
              {risksBlockers && (
                <div>
                  <span className="font-semibold text-neutral-600">סיכונים וחסמים: </span>
                  <div className="mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-neutral-700">
                    {risksBlockers}
                  </div>
                </div>
              )}
              {dependencies && (
                <div>
                  <span className="font-semibold text-neutral-600">תלויות: </span>
                  <span className="text-neutral-700">{dependencies}</span>
                </div>
              )}
            </div>
          </details>

          {/* Section: Links */}
          {links && (
            <details open className="bg-white border border-neutral-200 rounded-lg">
              <summary className="px-4 py-3 font-semibold text-sm text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center justify-between">
                <span>🔗 קישורים</span>
                <ChevronDown className="h-4 w-4 transition-transform chevron text-neutral-400" />
              </summary>
              <div className="px-4 pb-3 pt-2 text-sm text-right">
                <div className="flex flex-col gap-1 items-end">
                  {renderLinks(links)}
                </div>
              </div>
            </details>
          )}

          {/* Section: Milestones */}
          {milestones && milestones.length > 0 && (
            <details open className="bg-white border border-neutral-200 rounded-lg">
              <summary className="px-4 py-3 font-semibold text-sm text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center justify-between">
                <span>🎯 אבני דרך ({milestonesDoneCount}/{milestones.length})</span>
                <ChevronDown className="h-4 w-4 transition-transform chevron text-neutral-400" />
              </summary>
              <div className="px-4 pb-3 pt-2">
                <ul className="space-y-2">
                  {milestones.map((m, i) => {
                    const label = m.title ?? m.text ?? '';
                    if (!label) return null;
                    return (
                      <li
                        key={`${label}-${i}`}
                        className={cn(
                          'flex items-center gap-2.5 text-sm text-right',
                          m.done ? 'text-neutral-400' : 'text-neutral-700'
                        )}
                      >
                        <span className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full border-2 flex-shrink-0',
                          m.done 
                            ? 'border-green-500 bg-green-500 text-white' 
                            : 'border-neutral-300 bg-white'
                        )}>
                          {m.done && <span className="text-xs">✓</span>}
                        </span>
                        <span className={m.done ? 'line-through' : ''}>{label}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </details>
          )}

          {/* CTA to Open Full Editor */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onEdit) onEdit();
            }}
            className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <span>✏️ פתח לעריכה מלאה</span>
            <span className="text-xs opacity-90">(Stepper מודרך)</span>
          </button>

          <div className="mt-3 text-xs text-center text-neutral-500">
            💡 העריכה המלאה כוללת הנחיה צעד-אחר-צעד לכל השדות
          </div>
        </div>
      )}
    </div>
  );
}
