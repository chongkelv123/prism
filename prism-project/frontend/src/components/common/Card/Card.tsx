import React, { FC } from 'react';

export const Card: FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-xl bg-white shadow-lg p-8">
    {children}
  </div>
);
