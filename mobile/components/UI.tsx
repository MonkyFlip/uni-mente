import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, Modal as RNModal, TextInput,
  ScrollView, Pressable,
} from 'react-native';
import { ReactNode } from 'react';
import { Colors } from '../constants/colors';

// ── Button ────────────────────────────────────────────────────────
interface ButtonProps {
  onPress?:  () => void;
  children:  ReactNode;
  variant?:  'primary' | 'secondary' | 'danger';
  loading?:  boolean;
  disabled?: boolean;
  icon?:     ReactNode;
  size?:     'sm' | 'md' | 'lg';
  style?:    object;
}

export function Button({
  onPress, children, variant = 'primary',
  loading, disabled, icon, size = 'md', style,
}: ButtonProps) {
  const bg = variant === 'primary'   ? Colors.teal
           : variant === 'danger'    ? Colors.danger
           : Colors.navyHover;
  const border = variant === 'secondary' ? Colors.border : 'transparent';
  const pad = size === 'sm' ? 8 : size === 'lg' ? 16 : 12;
  const fs  = size === 'sm' ? 13 : size === 'lg' ? 16 : 14;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        btnStyles.base,
        { backgroundColor: bg, borderColor: border, paddingVertical: pad },
        (disabled || loading) && btnStyles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={Colors.white} />
      ) : (
        <View style={btnStyles.inner}>
          {icon && <View style={btnStyles.icon}>{icon}</View>}
          <Text style={[btnStyles.text, { fontSize: fs }]}>{children}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const btnStyles = StyleSheet.create({
  base: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  inner:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon:    { marginRight: 4 },
  text:    { color: Colors.white, fontWeight: '600' },
  disabled:{ opacity: 0.45 },
});

// ── Card ──────────────────────────────────────────────────────────
export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return (
    <View style={[cardStyles.card, style]}>
      {children}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.navyCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
});

// ── Alert ─────────────────────────────────────────────────────────
export function Alert({
  message, type = 'error',
}: { message: string; type?: 'error' | 'success' | 'warning' }) {
  const bg    = type === 'success' ? Colors.successBg
              : type === 'warning' ? Colors.warningBg
              : Colors.dangerBg;
  const color = type === 'success' ? Colors.success
              : type === 'warning' ? Colors.warning
              : Colors.danger;
  const border = type === 'success' ? 'rgba(62,207,142,0.2)'
               : type === 'warning' ? 'rgba(245,158,11,0.2)'
               : 'rgba(248,113,113,0.2)';
  return (
    <View style={[alertStyles.box, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[alertStyles.text, { color }]}>{message}</Text>
    </View>
  );
}

const alertStyles = StyleSheet.create({
  box:  { borderRadius: 9, borderWidth: 1, padding: 12, marginBottom: 12 },
  text: { fontSize: 13, lineHeight: 20 },
});

// ── Badge ─────────────────────────────────────────────────────────
type BadgeVariant = 'teal' | 'gray' | 'yellow' | 'green' | 'red';

const BADGE_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  teal:   { bg: Colors.tealGlow,                   text: Colors.teal    },
  gray:   { bg: 'rgba(255,255,255,0.07)',           text: Colors.creamDim},
  yellow: { bg: 'rgba(245,158,11,0.15)',            text: '#f59e0b'      },
  green:  { bg: Colors.successBg,                  text: Colors.success },
  red:    { bg: Colors.dangerBg,                   text: Colors.danger  },
};

export function Badge({ label, variant = 'gray' }: { label: string; variant?: BadgeVariant }) {
  const c = BADGE_COLORS[variant];
  return (
    <View style={[badgeStyles.badge, { backgroundColor: c.bg }]}>
      <Text style={[badgeStyles.text, { color: c.text }]}>{label}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  text:  { fontSize: 10, fontWeight: '700' },
});

// ── Spinner ───────────────────────────────────────────────────────
export function Spinner({ size = 'large' }: { size?: 'small' | 'large' }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
      <ActivityIndicator size={size} color={Colors.teal} />
    </View>
  );
}

// ── EmptyState ────────────────────────────────────────────────────
export function EmptyState({
  icon, title, description,
}: { icon: ReactNode; title: string; description?: string }) {
  return (
    <View style={emptyStyles.wrap}>
      <View style={emptyStyles.icon}>{icon}</View>
      <Text style={emptyStyles.title}>{title}</Text>
      {description && <Text style={emptyStyles.desc}>{description}</Text>}
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  wrap:  { alignItems: 'center', paddingVertical: 48, gap: 12 },
  icon:  { opacity: 0.4 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.cream, textAlign: 'center' },
  desc:  { fontSize: 13, color: Colors.creamDim, textAlign: 'center', maxWidth: 260, lineHeight: 20 },
});

// ── Field ─────────────────────────────────────────────────────────
export function Field({
  label, children, error,
}: { label: string; children: ReactNode; error?: string }) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      {children}
      {error && <Text style={fieldStyles.error}>{error}</Text>}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap:  { gap: 6 },
  label: { fontSize: 12, fontWeight: '500', color: Colors.creamDim },
  error: { fontSize: 12, color: Colors.danger },
});

// ── Input ─────────────────────────────────────────────────────────
export function Input(props: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={Colors.creamDim}
      {...props}
      style={[inputStyles.input, props.style]}
    />
  );
}

const inputStyles = StyleSheet.create({
  input: {
    backgroundColor: Colors.navyCard,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: Colors.white,
  },
});

// ── Modal ─────────────────────────────────────────────────────────
export function Modal({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <RNModal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={modalStyles.overlay} onPress={onClose}>
        <Pressable style={modalStyles.box} onPress={() => {}}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Text style={modalStyles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: Colors.overlay,
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  box: {
    backgroundColor: Colors.navyCard,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    width: '100%', maxHeight: '88%', padding: 20,
  },
  header:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title:     { fontSize: 18, fontWeight: '700', color: Colors.white },
  closeBtn:  { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.navyHover, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: Colors.creamDim, fontSize: 14 },
});

// ── SectionHeader ─────────────────────────────────────────────────
export function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <View style={shStyles.row}>
      <Text style={shStyles.title}>{title}</Text>
      {count !== undefined && (
        <View style={shStyles.badge}>
          <Text style={shStyles.badgeText}>{count}</Text>
        </View>
      )}
    </View>
  );
}

const shStyles = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 8 },
  title:     { fontSize: 16, fontWeight: '700', color: Colors.white },
  badge:     { backgroundColor: Colors.tealGlow, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 2 },
  badgeText: { color: Colors.teal, fontSize: 12, fontWeight: '700' },
});

// ── PageHeader ────────────────────────────────────────────────────
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={phStyles.wrap}>
      <Text style={phStyles.title}>{title}</Text>
      {subtitle && <Text style={phStyles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const phStyles = StyleSheet.create({
  wrap:     { marginBottom: 20 },
  title:    { fontSize: 26, fontWeight: '800', color: Colors.white },
  subtitle: { fontSize: 13, color: Colors.creamDim, marginTop: 4 },
});

// ── StatCard ──────────────────────────────────────────────────────
export function StatCard({
  icon, label, value,
}: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <View style={statStyles.card}>
      <View style={statStyles.icon}>{icon}</View>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card:  {
    flex: 1, backgroundColor: Colors.navyCard, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border,
    padding: 16, alignItems: 'flex-start', gap: 8,
  },
  icon:  { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.tealGlow, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 28, fontWeight: '800', color: Colors.white },
  label: { fontSize: 12, color: Colors.creamDim },
});

// ── usePagination hook ───────────────────────────────────────────
import { useState as useStateHook } from 'react';

export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useStateHook(1);
  const total     = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage  = Math.min(page, totalPages);
  const slice     = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    page:     safePage,
    setPage:  (p: number) => setPage(Math.max(1, Math.min(p, totalPages))),
    slice,
    total,
    totalPages,
    pageSize,
  };
}

// ── Pagination component ─────────────────────────────────────────
export function Pagination({
  total, page, totalPages, pageSize, onPage,
}: {
  total:      number;
  page:       number;
  totalPages: number;
  pageSize:   number;
  onPage:     (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  // Build page numbers with ellipsis
  const pages: (number | '…')[] = [];
  const add = (n: number) => { if (!pages.includes(n)) pages.push(n); };
  add(1);
  if (page > 3) pages.push('…');
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) add(i);
  if (page < totalPages - 2) pages.push('…');
  if (totalPages > 1) add(totalPages);

  return (
    <View style={pgStyles.wrap}>
      <Text style={pgStyles.info}>{from}–{to} de {total}</Text>
      <View style={pgStyles.btns}>
        <TouchableOpacity
          style={[pgStyles.btn, page === 1 && pgStyles.btnDisabled]}
          onPress={() => onPage(page - 1)}
          disabled={page === 1}
        >
          <Text style={[pgStyles.btnText, page === 1 && pgStyles.btnTextDisabled]}>‹</Text>
        </TouchableOpacity>

        {pages.map((p, i) =>
          p === '…' ? (
            <Text key={`e${i}`} style={pgStyles.ellipsis}>…</Text>
          ) : (
            <TouchableOpacity
              key={p}
              style={[pgStyles.btn, p === page && pgStyles.btnActive]}
              onPress={() => onPage(p as number)}
            >
              <Text style={[pgStyles.btnText, p === page && pgStyles.btnTextActive]}>{p}</Text>
            </TouchableOpacity>
          )
        )}

        <TouchableOpacity
          style={[pgStyles.btn, page === totalPages && pgStyles.btnDisabled]}
          onPress={() => onPage(page + 1)}
          disabled={page === totalPages}
        >
          <Text style={[pgStyles.btnText, page === totalPages && pgStyles.btnTextDisabled]}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


const pgStyles = StyleSheet.create({
  wrap:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, marginTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  info:          { fontSize: 12, color: Colors.creamDim },
  btns:          { flexDirection: 'row', alignItems: 'center', gap: 4 },
  btn:           { minWidth: 34, height: 34, borderRadius: 8, backgroundColor: Colors.navyCard, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  btnActive:     { backgroundColor: Colors.teal, borderColor: Colors.teal },
  btnDisabled:   { opacity: 0.35 },
  btnText:       { fontSize: 14, color: Colors.creamDim, fontWeight: '500' },
  btnTextActive: { color: Colors.navy, fontWeight: '700' },
  btnTextDisabled:{ color: Colors.creamDim },
  ellipsis:      { fontSize: 13, color: Colors.creamDim, paddingHorizontal: 4 },
});