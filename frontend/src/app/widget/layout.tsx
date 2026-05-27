import React from 'react';

export default function WidgetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-screen bg-transparent overflow-hidden">
      {children}
    </div>
  );
}
