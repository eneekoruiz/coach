"use client";
import React from 'react';

export default function Toast({ message }: { message: string }) {
  return (
    <div className="fixed right-4 bottom-6 z-50">
      <div className="bg-black text-white px-4 py-2 rounded shadow-lg">{message}</div>
    </div>
  );
}
