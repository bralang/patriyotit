'use client';
import { useEffect, useState } from 'react';
import { getHebrewDate } from '@/lib/hebcal';

interface Props {
  date: string | null | undefined;
}

export default function HebrewDate({ date }: Props) {
  const [hebrew, setHebrew] = useState('');

  useEffect(() => {
    if (!date) return;
    const d = date.includes('T') ? date.split('T')[0] : date;
    getHebrewDate(d).then(setHebrew).catch(() => {});
  }, [date]);

  if (!hebrew) return null;
  return <span className="hebrew-date">{hebrew}</span>;
}
