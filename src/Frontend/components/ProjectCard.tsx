import React from 'react';
import { Project } from '../../Backend/types';
import { Calendar, MapPin, Clock, ArrowRight, Star } from 'lucide-react';
import { cn } from '../../Backend/lib/utils';
import { useTranslation } from 'react-i18next';

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
  onRate?: (project: Project) => void;
}

export default function ProjectCard({ project, onClick, onRate }: ProjectCardProps) {
  const { t } = useTranslation();
  const statusColors = {
    PENDING: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    IN_PROGRESS: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    VALIDATION: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    COMPLETED: 'bg-green-500/10 text-green-500 border-green-500/20',
    READY: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    MODIFICATION_REQUESTED: 'bg-red-500/10 text-red-500 border-red-500/20',
    UNDER_REVIEW: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    ACCEPTED: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
    REJECTED: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
  };

  return (
    <div 
      className="bento-card group flex flex-col h-full cursor-pointer hover:border-primary/50"
      onClick={onClick}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-[4rem] group-hover:scale-110 transition-transform duration-700 -z-10" />
      
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-1">
          <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border w-fit", statusColors[project.status])}>
            {t(`status.${project.status}`) || project.status.replace('_', ' ')}
          </div>
          <h3 className="text-xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors pr-4 pt-2">
            {project.name}
          </h3>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
          <ArrowRight className="w-5 h-5 -rotate-45 group-hover:rotate-0 transition-transform" />
        </div>
      </div>

      <p className="text-muted-foreground text-sm font-medium line-clamp-2 mb-8 leading-relaxed">
        {project.description}
      </p>

      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Échéance</p>
            <p className="text-sm font-bold">{new Date(project.deadline).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Emplacement</p>
            <p className="text-sm font-bold truncate max-w-[180px]">{project.location || 'N/A'}</p>
          </div>
        </div>
      </div>

      <div className="mt-auto">
        <div className="flex justify-between items-end mb-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Progression</span>
          <span className="text-sm font-black text-primary">{project.progress}%</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden p-0.5 shadow-inner">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-1000 relative" 
            style={{ width: `${project.progress}%` }}
          >
             <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 rounded-full" />
          </div>
        </div>
      </div>

      {project.status === 'COMPLETED' && onRate && (
        project.hasReview ? (
          <div 
            onClick={(e) => e.stopPropagation()}
            className="mt-6 w-full py-3 bg-emerald-500/5 text-emerald-600 rounded-3xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-emerald-500/10"
          >
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={`project-card-star-${star}`}
                  className={cn(
                    "w-3.5 h-3.5",
                    (project.ratingValue || 5) >= star ? "fill-emerald-500 text-emerald-500" : "text-emerald-500/20"
                  )}
                />
              ))}
            </div>
            <span className="ml-1">Évalué</span>
          </div>
        ) : (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onRate(project);
            }}
            className="mt-6 w-full py-4 bg-amber-500/10 text-amber-600 rounded-3xl text-xs font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            Évaluer le Cabinet
          </button>
        )
      )}
    </div>
  );
}
