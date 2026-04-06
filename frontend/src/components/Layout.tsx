import { useState } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import styles from './Layout.module.css';

export function Layout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(
    // En móvil arranca colapsado por defecto
    typeof window !== 'undefined' && window.innerWidth < 768
  );

  return (
    <div className={`${styles.layout} ${collapsed ? styles.layoutCollapsed : ''}`}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main className={styles.main}>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}