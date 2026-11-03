import { describe, expect, it } from 'vitest';
import { deServidor } from '@data/mappers/adaptador.js';
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
});
