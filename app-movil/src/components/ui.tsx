import { ReactNode, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

export const colores = {
  fondo: '#F3F5F8',
  superficie: '#FFFFFF',
  texto: '#14202B',
  secundario: '#5A6876',
  borde: '#D9DFE6',
  primario: '#0E5E8C',
  primarioSuave: '#E4F0F7',
  exito: '#13703F',
  exitoFondo: '#E5F4EB',
  error: '#B3261E',
  errorFondo: '#FBEAE9',
  aviso: '#7A4F00',
  avisoFondo: '#FFF3D6',
};

export const ICONOS: Record<string, string> = {
  desktop: '💻',
  bulb: '💡',
  chair: '🪑',
  wifi: '📶',
  flash: '⚡',
};

export const ESTADOS: { valor: string; etiqueta: string; color: string; fondo: string }[] = [
  { valor: 'PENDIENTE', etiqueta: 'Pendiente', color: '#8A5300', fondo: '#FFF1D2' },
  { valor: 'EN_REVISION', etiqueta: 'En revisión', color: '#0B5394', fondo: '#E2EEFA' },
  { valor: 'ATENDIDO', etiqueta: 'Atendido', color: '#13703F', fondo: '#E2F3E9' },
  { valor: 'CERRADO', etiqueta: 'Cerrado', color: '#4B5563', fondo: '#ECEEF1' },
];

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatearFecha(iso: string, conHora = false): string {
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const d = soloFecha ? new Date(`${iso}T12:00:00`) : new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const base = `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
  if (!conHora || soloFecha) return base;
  return `${base}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

type BotonProps = {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'texto';
  deshabilitado?: boolean;
  cargando?: boolean;
};

export function Boton({ titulo, onPress, variante = 'primario', deshabilitado, cargando }: BotonProps) {
  const primario = variante === 'primario';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: deshabilitado || cargando }}
      disabled={deshabilitado || cargando}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.boton,
        primario && estilos.botonPrimario,
        variante === 'secundario' && estilos.botonSecundario,
        variante === 'texto' && estilos.botonTexto,
        pressed && { opacity: 0.85 },
        (deshabilitado || cargando) && { opacity: 0.55 },
      ]}
    >
      {cargando ? <ActivityIndicator color={primario ? '#FFF' : colores.primario} style={{ marginRight: 8 }} /> : null}
      <Text style={[estilos.botonEtiqueta, !primario && { color: colores.primario }]}>{titulo}</Text>
    </Pressable>
  );
}

export function Mensaje({ tipo, children, titulo }: { tipo: 'exito' | 'error' | 'aviso' | 'info'; children: ReactNode; titulo?: string }) {
  const fondo = { exito: colores.exitoFondo, error: colores.errorFondo, aviso: colores.avisoFondo, info: colores.primarioSuave }[tipo];
  const color = { exito: colores.exito, error: colores.error, aviso: colores.aviso, info: colores.primario }[tipo];
  return (
    <View accessibilityLiveRegion="polite" style={[estilos.mensaje, { backgroundColor: fondo, borderLeftColor: color }]}>
      {titulo ? <Text style={{ color, fontWeight: '700', fontSize: 15, marginBottom: 2 }}>{titulo}</Text> : null}
      <Text style={{ color, fontSize: 14, lineHeight: 20 }}>{children}</Text>
    </View>
  );
}

export function Campo({ etiqueta, error, ayuda, ...props }: TextInputProps & { etiqueta: string; error?: string; ayuda?: string }) {
  const [foco, setFoco] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput
        placeholderTextColor="#8A96A3"
        {...props}
        onFocus={(e) => {
          setFoco(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFoco(false);
          props.onBlur?.(e);
        }}
        style={[
          estilos.entrada,
          props.multiline && { minHeight: 110, textAlignVertical: 'top', paddingTop: 12 },
          foco && { borderColor: colores.primario },
          !!error && { borderColor: colores.error },
          props.style,
        ]}
      />
      {error ? <Text style={estilos.textoError}>{error}</Text> : ayuda ? <Text style={estilos.ayuda}>{ayuda}</Text> : null}
    </View>
  );
}

export function Chip({ texto, activo, onPress, icono }: { texto: string; activo?: boolean; onPress: () => void; icono?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!activo }}
      onPress={onPress}
      style={[estilos.chip, activo && estilos.chipActivo]}
    >
      <Text style={[estilos.chipTexto, activo && { color: '#FFF' }]}>
        {icono ? `${icono}  ` : ''}
        {texto}
      </Text>
    </Pressable>
  );
}

export function EstadoBadge({ estado, etiqueta }: { estado: string; etiqueta: string }) {
  const e = ESTADOS.find((x) => x.valor === estado) ?? { color: '#9A3412', fondo: '#FFE8D9' };
  return (
    <View style={[estilos.badge, { backgroundColor: e.fondo }]}>
      <Text style={{ color: e.color, fontSize: 12, fontWeight: '700' }}>{etiqueta}</Text>
    </View>
  );
}

export function Tarjeta({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[estilos.tarjeta, style]}>{children}</View>;
}

export function Miniatura({ url, icono, tam = 56 }: { url: string | null; icono: string; tam?: number }) {
  const [fallo, setFallo] = useState(false);
  if (url && !fallo) {
    return (
      <Image
        accessibilityLabel="Fotografía de evidencia"
        onError={() => setFallo(true)}
        source={{ uri: url }}
        style={{ width: tam, height: tam, borderRadius: 10, backgroundColor: colores.borde }}
      />
    );
  }
  return (
    <View style={[estilos.miniaturaVacia, { width: tam, height: tam }]}>
      <Text style={{ fontSize: tam * 0.45 }}>{ICONOS[icono] ?? '🛠️'}</Text>
    </View>
  );
}

export function Seccion({ titulo, children, error }: { titulo: string; children: ReactNode; error?: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={estilos.etiqueta}>{titulo}</Text>
      {children}
      {error ? <Text style={estilos.textoError}>{error}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  boton: {
    minHeight: 50,
    borderRadius: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  botonPrimario: { backgroundColor: colores.primario },
  botonSecundario: { backgroundColor: colores.superficie, borderWidth: 1, borderColor: colores.borde },
  botonTexto: { backgroundColor: 'transparent', minHeight: 40 },
  botonEtiqueta: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  mensaje: { borderRadius: 10, padding: 12, borderLeftWidth: 4 },
  etiqueta: { fontSize: 14, fontWeight: '700', color: colores.texto },
  entrada: {
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: colores.borde,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colores.texto,
    backgroundColor: colores.superficie,
  },
  textoError: { color: colores.error, fontSize: 13 },
  ayuda: { color: colores.secundario, fontSize: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
  },
  chipActivo: { backgroundColor: colores.primario, borderColor: colores.primario },
  chipTexto: { color: colores.texto, fontSize: 14, fontWeight: '600' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  tarjeta: {
    backgroundColor: colores.superficie,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E4E8EE',
    shadowColor: '#0F1E2D',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  miniaturaVacia: { borderRadius: 10, backgroundColor: colores.primarioSuave, alignItems: 'center', justifyContent: 'center' },
});
