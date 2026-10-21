# Licencias de las fuentes que viajan en este paquete

Tres de las cuatro familias que este paquete redistribuye llevan licencia
abierta, y las tres **exigen que su texto acompañe a la redistribución**.
Durante meses no lo acompañaba: no había un solo archivo de licencia en
`public/fonts/`. Lo exige ahora `check:fuentes` (fnt-1), que deriva las familias
de los `@font-face` reales y pide un archivo que nombre a cada una — no una
lista a mano.

| Familia | Papel en el sistema | Licencia | Archivo | ¿Modificar? |
| --- | --- | --- | --- | --- |
| Ubuntu | `--font-body` | Ubuntu Font Licence 1.0 | `UFL-1.0-Ubuntu.txt` | Sí |
| IBM Plex Mono | `--font-mono` | SIL OFL 1.1 | `OFL-1.1-IBM-Plex.txt` | Sí |
| Material Symbols Rounded · **Flow Symbols** | iconografía (`flow-symbol`) | Apache-2.0 | `Apache-2.0-Material-Symbols.txt` | Sí |
| Edenred | `--font-display` | propietaria, uso interno | `Edenred.txt` | **Sin confirmar** |

**`Flow Symbols` es el mismo archivo**, declarado con familia propia en
`tokens/fonts.css` (fnt-7): el sistema se queda con el `font-display` de los
iconos en vez de dejarlo en el `<link>` del consumidor, y un nombre propio evita
que las dos caras compitan si ese `<link>` sigue ahí. Renombrar una familia en
CSS no cambia su licencia — y aquí vale porque Apache-2.0 permite modificar y
redistribuir, que es la misma puerta por la que pasa el subset.

La última columna no es un adorno: **el subset de Material Symbols sólo es
legal porque Apache-2.0 permite modificar**. Muchas licencias tipográficas
comerciales lo prohíben expresamente, así que la familia que algún día no se
pueda subsetear ni reempaquetar puede ser precisamente una in-house con
licencia. Ese dato tiene que estar escrito donde la tubería lo lea, no
descubrirse cuando el subset ya está generado.

Los tres textos abiertos se copiaron de su fuente upstream
(`canonical/Ubuntu-Sans-fonts`, `IBM/plex`, `google/material-design-icons`) y no
se editan: una licencia reescrita a mano es una licencia distinta.
