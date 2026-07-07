import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVtexProducts, parsePickupPoints } from "./connectors/vtex";

const CATALOG = [
  {
    productName: "Losartana Potássica 50mg 30 Comprimidos Genérico EMS",
    brand: "EMS",
    items: [
      {
        itemId: "27155",
        ean: "7896004706795",
        sellers: [{ commertialOffer: { Price: 5.99, ListPrice: 22.23, AvailableQuantity: 100 } }],
      },
    ],
  },
  { productName: "Sem oferta", brand: "X", items: [{ itemId: "1", ean: "0000000000000", sellers: [{ commertialOffer: { Price: 0, AvailableQuantity: 0 } }] }] },
];

const PICKUP = {
  paging: { total: 1 },
  items: [
    {
      distance: 0.5,
      pickupPoint: {
        id: "paguemenos00325_x",
        name: "Loja 325",
        address: {
          street: "Avenida T",
          number: "63",
          neighborhood: "Setor Bueno",
          city: "Goiânia",
          state: "GO",
          geoCoordinates: [-49.26787, -16.71445],
        },
      },
    },
  ],
};

test("parseVtexProducts extrai ean e converte preco pra centavos", () => {
  const p = parseVtexProducts(CATALOG);
  assert.equal(p.length, 2);
  assert.equal(p[0]!.ean, "7896004706795");
  assert.equal(p[0]!.precoCentavos, 599);
  assert.equal(p[0]!.listaCentavos, 2223);
  assert.equal(p[0]!.disponivel, true);
  assert.equal(p[1]!.disponivel, false); // AvailableQuantity 0
});

test("parsePickupPoints extrai loja de Goiania com geo (lng;lat invertido)", () => {
  const l = parsePickupPoints(PICKUP);
  assert.equal(l.length, 1);
  assert.equal(l[0]!.cidade, "Goiânia");
  assert.equal(l[0]!.uf, "GO");
  assert.equal(l[0]!.bairro, "Setor Bueno");
  assert.equal(l[0]!.endereco, "Avenida T, 63");
  assert.equal(l[0]!.lng, -49.26787);
  assert.equal(l[0]!.lat, -16.71445);
});

test("parsers aguentam entrada vazia/invalida", () => {
  assert.deepEqual(parseVtexProducts(null), []);
  assert.deepEqual(parsePickupPoints({ foo: 1 }), []);
});
