import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion, useScroll, useSpring, useTransform, MotionValue } from 'motion/react';

// Shared scroll motion for the public pages: things rise and sharpen into place as they scroll into view, a thin
// progress line along the top, and a typing effect for the AI demos. Everything settles instantly for people who
// ask their system for reduced motion

const EASE = [0.22, 1, 0.36, 1] as const;

// Rises and fades into place the first time it scrolls into view
export const Reveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: 'div' | 'li' | 'section' | 'span';
}> = ({ children, delay = 0, y = 24, className, as = 'div' }) => {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.8, ease: EASE, delay }}
    >
      {children}
    </Tag>
  );
};

// A headline whose words rise in one after another
export const WordsIn: React.FC<{ text: string; className?: string; delay?: number; highlight?: string[] }> = ({
  text,
  className,
  delay = 0,
  highlight = [],
}) => {
  const reduce = useReducedMotion();
  const lines = text.split('\n');
  let n = 0;
  return (
    <span className={className}>
      {lines.map((line, li) => (
        <span key={li} className="block">
          {line.split(' ').map((word, wi) => {
            const i = n++;
            return (
              <span key={wi} className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]">
                <motion.span
                  className={`inline-block ${highlight.includes(word) ? 'ai-text' : ''}`}
                  initial={reduce ? false : { y: '110%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.9, ease: EASE, delay: delay + i * 0.06 }}
                >
                  {word}
                </motion.span>
                {wi < line.split(' ').length - 1 && ' '}
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
};

// The thin AI-coloured line across the top of the page that fills as you scroll
export const ScrollProgress: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  return <motion.div aria-hidden="true" style={{ scaleX }} className="fixed top-0 inset-x-0 h-[2px] origin-left z-50 ai-gradient" />;
};

// Moves a layer at a fraction of the scroll speed, for depth in the hero
export const useParallax = (distance = 80): { ref: React.RefObject<HTMLDivElement | null>; y: MotionValue<number> } => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [0, distance]);
  return { ref, y };
};

// Types out the text while `active`, then holds it; clears when it stops being active
export const useTypewriter = (text: string, active: boolean, speed = 18): string => {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? text : '');
  useEffect(() => {
    if (reduce) {
      setShown(text);
      return;
    }
    if (!active) {
      setShown('');
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [text, active, speed, reduce]);
  return shown;
};

// Steps a demo through its stages while it's on screen: 0, 1, 2 … then back to 0, each held for its own time
export const useStages = (durations: number[]): { ref: React.RefObject<HTMLDivElement | null>; stage: number } => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-10% 0px' });
  const reduce = useReducedMotion();
  const [stage, setStage] = useState(reduce ? durations.length - 1 : 0);
  useEffect(() => {
    if (reduce || !inView) return;
    const id = window.setTimeout(() => setStage((s) => (s + 1) % durations.length), durations[stage]);
    return () => window.clearTimeout(id);
  }, [stage, inView, reduce, durations]);
  return { ref, stage };
};

// A vertical line that draws itself as its section scrolls past
export const ScrollLine: React.FC<{ target: React.RefObject<HTMLElement | null>; className?: string }> = ({ target, className = '' }) => {
  const { scrollYProgress } = useScroll({ target, offset: ['start 70%', 'end 60%'] });
  return (
    <div aria-hidden="true" className={`absolute w-px bg-slate-200 ${className}`}>
      <motion.div style={{ scaleY: scrollYProgress }} className="absolute inset-0 origin-top ai-gradient-v" />
    </div>
  );
};

export { motion };
