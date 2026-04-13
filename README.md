# PhotoMark Pro

Aplicación web ligera para agregar una marca de agua con datos específicos a una foto subida por el usuario, editarla en el navegador y descargarla al instante.

## Características

- Carga de imagen local (sin backend).
- Marca de agua con campos personalizados:
  - Marca / Empresa
  - Nombre completo
  - ID / Documento
  - Fecha y hora
  - Código interno
- Ajuste de opacidad y posición.
- Descarga en formato PNG.
- Diseño responsive para móvil y escritorio.

## Privacidad

La imagen se procesa completamente en el navegador. No se guarda ni se envía a ningún servidor.

## Uso

1. Abre `index.html` en tu navegador.
2. Sube una foto.
3. Completa los datos de la marca de agua.
4. Ajusta posición/opacidad si lo necesitas.
5. Pulsa "Descargar imagen".

## Estructura

- `index.html`: interfaz de usuario.
- `styles.css`: estilos y layout responsive.
- `app.js`: lógica de carga, edición y descarga.

## Publicación en GitHub

Comandos sugeridos:

```bash
git init
git add .
git commit -m "feat: app para marca de agua local responsive"
git branch -M main
git remote add origin https://github.com/vidafem/photo.git
git push -u origin main
```
