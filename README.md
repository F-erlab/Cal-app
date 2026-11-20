# Cal app

App web para registrar calorías y seguir un déficit calórico.

## Qué hace

- **Datos iniciales:** sexo, edad, peso, altura, nivel de actividad física y déficit (leve −200, moderado −600, alto −1000 kcal).
- **Cálculos:** IMC, calorías de mantenimiento (fórmula de Mifflin-St Jeor × factor de actividad) y objetivo diario.
- **Registro de comidas:** se escribe en lenguaje natural («3 huevos revueltos», «200 g de arroz», «1 taza de leche») y la app calcula calorías, proteína, carbohidratos y grasas. La cantidad se puede ajustar antes de agregar.
- **Fuentes de datos:** tabla local de unos 260 alimentos y platos comunes, con comidas paraguayas (`foods.js`, valores aproximados por 100 g) y búsqueda en internet en [Open Food Facts](https://world.openfoodfacts.org).
- **Búsqueda tolerante:** reconoce errores de tipeo («hevos», «arros con pollo») y nombres alternativos («mandioca» / «yuca»).
- **Mis alimentos:** si algo no aparece, se crea con los datos de la etiqueta o la receta (por porción o por gramos) y queda guardado para las próximas búsquedas.
- **Progreso:** anillo con las calorías consumidas contra el objetivo y gráfico de los últimos 14 días.
- **Historial:** cada día queda guardado y se puede volver a consultar o editar.
- **Favoritos y recientes:** las comidas ya registradas se vuelven a agregar con un toque; con la estrella se guardan como favoritas.
- **Seguimiento de peso:** registro por día con gráfico de evolución; el objetivo de calorías se recalcula con el último peso.
- **Tema claro y oscuro.**

Los datos se guardan en el navegador (`localStorage`); no hay servidor ni cuentas.

## Cómo usarla

Es un sitio estático, sin dependencias ni compilación. Basta con abrir `index.html`, o servir la carpeta:

```bash
python3 -m http.server 8000
```

Para publicarla gratis: en GitHub, *Settings → Pages → Deploy from a branch* y elegir la rama que contiene estos archivos.

## Archivos

- `index.html` — estructura
- `styles.css` — estilos y temas
- `app.js` — cálculos, buscador, registro e historial
- `foods.js` — tabla local de alimentos

Los valores nutricionales son estimaciones y la app no reemplaza el consejo de un profesional de la salud.
