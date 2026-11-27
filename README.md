# Cal app

App web para registrar calorías y seguir un déficit calórico.

## Qué hace

- **Datos iniciales:** sexo, edad, peso, altura, nivel de actividad física y déficit (leve −200, moderado −600, alto −1000 kcal).
- **Cálculos:** IMC, calorías de mantenimiento (fórmula de Mifflin-St Jeor × factor de actividad) y objetivo diario.
- **Registro de comidas:** se escribe en lenguaje natural («3 huevos revueltos», «200 g de arroz», «1 taza de leche») y la app calcula calorías, proteína, carbohidratos y grasas. La cantidad se puede ajustar antes de agregar.
- **Fuentes de datos:** tabla local de unos 260 alimentos y platos comunes, con comidas paraguayas (`foods.js`, valores aproximados por 100 g) y búsqueda en internet en [Open Food Facts](https://world.openfoodfacts.org).
- **Búsqueda tolerante:** reconoce errores de tipeo («hevos», «arros con pollo») y nombres alternativos («mandioca» / «yuca»).
- **Combinaciones automáticas:** si no existe un plato con ese nombre, «pan con queso» o «arroz, pollo y ensalada» se calcula sumando cada ingrediente; se puede cambiar cada ingrediente y su cantidad.
- **Mis alimentos:** si algo no aparece, se crea con los datos de la etiqueta o la receta (por porción o por gramos) y queda guardado para las próximas búsquedas.
- **Tres secciones:** Hoy, Progreso y Perfil, con barra de navegación abajo en el celular. Al bajar por la página, el encabezado muestra el día y las kcal restantes.
- **Anillo del día:** muestra las kcal restantes (o las consumidas, tocando el centro); el anillo interior muestra la proteína.
- **Metas de macros:** la proteína se calcula según el peso, la actividad y el déficit (con un peso de referencia ajustado si hay sobrepeso), o se fija a mano. Las grasas son el 27 % del objetivo y los carbohidratos, el resto.
- **Editar y deshacer:** cada comida registrada se puede tocar para cambiar la cantidad o la sección. Agregar, editar o borrar muestra un aviso con «Deshacer».
- **Elegir la sección:** arriba del buscador se elige si se agrega al desayuno, almuerzo, merienda, cena o snack (también desde favoritos y recientes).
- **Repetir comidas:** copiar a hoy una comida o el día completo de ayer (o de cualquier día anterior).
- **Favoritos y recientes:** las comidas ya registradas se vuelven a agregar con un toque, sin repetidos; con la estrella se guardan como favoritas.
- **Progreso:** racha de días seguidos, resumen de los últimos 7 días (promedio, días en objetivo, proteína y déficit acumulado) y gráfico de 14 días coloreado según el resultado.
- **Peso y meta:** registro por día con gráfico, línea de tendencia y peso meta con fecha estimada de llegada. El objetivo de calorías se recalcula con el último peso.
- **Copia de seguridad:** desde Perfil se descarga un archivo `.json` con todos los datos y se restaura en otro navegador o dispositivo.
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
