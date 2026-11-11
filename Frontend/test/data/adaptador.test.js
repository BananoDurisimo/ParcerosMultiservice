import { describe, expect, it } from 'vitest';
import { deServidor, aServidor } from '@data/mappers/adaptador.js';
import { EN_SERVIDOR } from '@core/utils/archivos.js';
import { VACIO } from '@data/models/colecciones.js';

describe('mapeador de la API', () => {
  it('traduce las tablas al formato del frontend (id, estado, NULL -> "")', () => {
    const d = deServidor({
      ...Object.fromEntries(Object.keys(VACIO).filter((k) => k !== 'catalogos').map((k) => [k, []])),
      tipos_documento: [{ id_tipo_documento: 1, nombre: 'Cédula' }],
      estados_pedido: [], estados_compra: [], metodos_pago: [],
      clientes: [{ id_cliente: 5, id_tipo_documento: 1, nombre: 'Club', documento: '001', telefono: null, correo: 'a@b.c', direccion: null, activo: false }],
    });
    const [c] = d.clientes;
    expect(c.id).toBe(5);
    expect(c.estado).toBe('Inactivo');
    expect(c.tipodocumento).toBe('Cédula');
    expect(c.telefono).toBe('');
  });

  it('el adjunto llega sin contenido y, si no se cambia, no se vuelve a enviar', () => {
    const vacios = Object.fromEntries(Object.keys(VACIO).filter((k) => k !== 'catalogos').map((k) => [k, []]));
    const cat = { tipos_documento: [], estados_pedido: [], estados_compra: [], metodos_pago: [{ id_metodo_pago: 1, nombre: 'Efectivo' }] };
    const d = deServidor({ ...vacios, ...cat, abonos: [
      { id_abono: 1, id_pedido: 2, id_metodo_pago: 1, monto: 10, fecha: '2026-08-30', anulado: false, tiene_comprobante: true },
      { id_abono: 2, id_pedido: 2, id_metodo_pago: 1, monto: 10, fecha: '2026-08-30', anulado: false, tiene_comprobante: false },
    ] });
    const [con, sin] = d.abonos;
    expect(con.url_comprobante).toBe(EN_SERVIDOR);
    expect(sin.url_comprobante).toBe('');
    const sid = (_, id) => id;
    /* Editar otro campo no borra el comprobante guardado. */
    expect(JSON.parse(JSON.stringify(aServidor('abonos', { ...con, fecha: '2026-08-31' }, cat, sid)))).not.toHaveProperty('ruta_comprobante');
    /* Un archivo nuevo, o quitarlo, si se envia. */
    expect(aServidor('abonos', { ...con, url_comprobante: 'data:image/png;base64,AA' }, cat, sid).ruta_comprobante).toBe('data:image/png;base64,AA');
    expect(aServidor('abonos', { ...con, url_comprobante: '' }, cat, sid).ruta_comprobante).toBe('');
  });
});
