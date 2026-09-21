# Fotos del carrusel principal

Copie aquí las imágenes que quiere ver en el carrusel grande del inicio
(las de la cuenta de Instagram, equipos con sus uniformes, fotos del taller…).

No hay que tocar código: **toda imagen que esté en esta carpeta entra sola
al carrusel**, en el orden del nombre del archivo.

## Cómo nombrarlas

Numérelas para fijar el orden, y luego escriba el texto que debe aparecer
sobre la foto separado por guiones:

```
01-uniformes-de-futbol.jpg       ->  "Uniformes de futbol"
02-camisolas-de-beisbol.jpg      ->  "Camisolas de beisbol"
03-jerseys-de-ciclismo.jpg       ->  "Jerseys de ciclismo"
```

Si el archivo conserva el nombre de la cámara o del teléfono
(`IMG_2024.jpg`, `WhatsApp Image….jpeg`) la foto igual se muestra, pero sin
título encima.

## Recomendaciones

| Punto      | Valor                                              |
| ---------- | -------------------------------------------------- |
| Formato    | `.jpg`, `.jpeg`, `.png`, `.webp` o `.avif`         |
| Medida     | 1600 × 900 px (horizontal)                         |
| Peso       | menos de 400 KB por foto (comprímalas antes)       |
| Cantidad   | entre 3 y 6                                        |

Las fotos verticales de Instagram funcionan, pero se recortan arriba y abajo
para llenar el ancho del carrusel: si puede, exporte la versión horizontal.

Mientras esta carpeta esté vacía se usan tres fotografías de ejemplo que ya
venían en el proyecto (`hero-deportivo.jpg`, `prod-deportivo.jpg` y
`taller.jpg`, en `src/features/home/assets/`). En cuanto haya al menos una
imagen aquí, esas de ejemplo dejan de mostrarse en el carrusel.

> Las de ejemplo se siguen copiando a la carpeta compilada aunque no se vean;
> el navegador nunca las descarga. `taller.jpg` además se usa en la sección
> "Nosotros", así que esa no se debe borrar.
