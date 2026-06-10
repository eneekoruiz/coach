'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';

type AccordionContextValue = {
  type: 'single';
  collapsible: boolean;
  value?: string;
  onValueChange?: (value: string | undefined) => void;
};

const AccordionContext = React.createContext<AccordionContextValue | null>(null);
const AccordionItemContext = React.createContext<{ value: string } | null>(null);

export function Accordion({
  type,
  collapsible,
  value,
  onValueChange,
  className,
  children,
}: {
  type: 'single';
  collapsible?: boolean;
  value?: string;
  onValueChange?: (value: string | undefined) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionContext.Provider value={{ type, collapsible: Boolean(collapsible), value, onValueChange }}>
      <div className={className}>{children}</div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItemContext.Provider value={{ value }}>
      <div className={className}>{children}</div>
    </AccordionItemContext.Provider>
  );
}

export function AccordionTrigger({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const accordion = React.useContext(AccordionContext);
  const item = React.useContext(AccordionItemContext);

  if (!accordion || !item) {
    throw new Error('AccordionTrigger must be used inside AccordionItem.');
  }

  const isOpen = accordion.value === item.value;

  return (
    <button
      type="button"
      onClick={() => {
        if (isOpen && accordion.collapsible) {
          accordion.onValueChange?.(undefined);
          return;
        }
        accordion.onValueChange?.(item.value);
      }}
      className={className}
      aria-expanded={isOpen}
    >
      <span>{children}</span>
      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );
}

export function AccordionContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const accordion = React.useContext(AccordionContext);
  const item = React.useContext(AccordionItemContext);

  if (!accordion || !item) {
    throw new Error('AccordionContent must be used inside AccordionItem.');
  }

  const isOpen = accordion.value === item.value;

  return (
    <div className={`${isOpen ? 'block' : 'hidden'} ${className ?? ''}`}>
      {children}
    </div>
  );
}
