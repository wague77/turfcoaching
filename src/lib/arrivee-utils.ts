
// Utility functions for arrivée highlighting across all tabs

export interface ArriveeStyle {
  border: string;
  background: string;
  text: string;
  badge: string;
}

export function getArriveePosition(numero: number, arrivee: number[]): number {
  const pos = arrivee.indexOf(numero);
  return pos === -1 ? -1 : pos + 1; // 1-indexed position
}

export function isInArrivee(numero: number, arrivee: number[]): boolean {
  return arrivee.includes(numero);
}

export function getArriveeStyle(position: number): ArriveeStyle {
  switch (position) {
    case 1:
      return {
        border: 'border-amber-400',
        background: 'bg-amber-400/20',
        text: 'text-amber-400',
        badge: '1er'
      };
    case 2:
      return {
        border: 'border-slate-300',
        background: 'bg-slate-300/20',
        text: 'text-slate-300',
        badge: '2e'
      };
    case 3:
      return {
        border: 'border-orange-500',
        background: 'bg-orange-500/20',
        text: 'text-orange-400',
        badge: '3e'
      };
    case 4:
      return {
        border: 'border-blue-400',
        background: 'bg-blue-400/20',
        text: 'text-blue-400',
        badge: '4e'
      };
    case 5:
      return {
        border: 'border-purple-400',
        background: 'bg-purple-400/20',
        text: 'text-purple-400',
        badge: '5e'
      };
    default:
      return {
        border: '',
        background: '',
        text: '',
        badge: ''
      };
  }
}

export function getArriveeBadge(numero: number, arrivee: number[]): string | null {
  const position = getArriveePosition(numero, arrivee);
  if (position === -1 || position > 5) return null;
  return getArriveeStyle(position).badge;
}

