# Archipiélago Vivo — App

Repositorio técnico del proyecto **Archipiélago Vivo**.

Este repositorio contiene el código, configuraciones, esquemas de datos, documentación técnica y otros recursos necesarios para desarrollar y mantener las herramientas digitales del proyecto.

> **Este repositorio contiene el sistema. No contiene los datos privados de las personas o entidades registradas.**

---

## Índice

* [Descripción](#descripción)
* [Arquitectura](#arquitectura)
* [Estructura del repositorio](#estructura-del-repositorio)
* [Apps Script](#apps-script)
* [Datos](#datos)
* [Imágenes](#imágenes)
* [Configuración](#configuración)
* [Versionado](#versionado)
* [Changelog](#changelog)
* [Seguridad](#seguridad)
* [Documentación](#documentación)
* [Estado del proyecto](#estado-del-proyecto)

---

## Descripción

**Archipiélago Vivo** es un proyecto de mapeo y documentación de iniciativas, personas, colectivos, proyectos y otros agentes vinculados al territorio de Canarias.

Este repositorio centraliza la parte técnica que permite gestionar y publicar esa información.

El sistema se desarrolla de forma progresiva y puede incorporar diferentes servicios y herramientas, entre ellos:

* Google Sheets como fuente de datos.
* Google Apps Script para automatización y procesamiento.
* uMap para la visualización cartográfica.
* GitHub para control de versiones y almacenamiento de recursos técnicos.
* GitHub Pages y otros servicios web para publicación.
* Un repositorio independiente para las imágenes de las entidades.

---

## Arquitectura

La arquitectura actual se basa en la siguiente relación:

```text
                         ┌─────────────────────┐
                         │    Google Sheets    │
                         │       DATA          │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    Google Apps      │
                         │       Script       │
                         └──────────┬──────────┘
                                    │
                  ┌─────────────────┼─────────────────┐
                  │                 │                 │
                  ▼                 ▼                 ▼
          ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
          │     uMap     │  │  GitHub IMG  │  │ Otros datos  │
          │     MAP      │  │   imágenes   │  │   públicos   │
          └──────────────┘  └──────────────┘  └──────────────┘
```

Esta arquitectura puede cambiar a medida que evolucione el proyecto.

La documentación de la arquitectura se encuentra en:

```text
docs/architecture.md
```

---

## Estructura del repositorio

```text
archipielagovivo-app/
│
├── README.md
├── LICENSE
├── .gitignore
│
├── apps-script/
│   └── src/
│       ├── Code.gs
│       ├── config.gs
│       ├── data.gs
│       ├── validation.gs
│       └── utils.gs
│
├── data/
│   ├── README.md
│   ├── schemas/
│   ├── lists/
│   └── reference/
│
├── config/
│   ├── fields/
│   ├── categories/
│   └── environments/
│
└── docs/
    ├── architecture.md
    ├── data-model.md
    ├── apps-script.md
    └── changelog.md
```

La estructura puede ampliarse cuando aparezcan nuevos componentes del sistema.

---

# Apps Script

El código de **Google Apps Script** se almacena en `apps-script/src/`.
Los módulos están organizados por responsabilidad. Archivos clave presentes:

- `00_Config.gs`                : configuración global y constantes (incluye referencia a la hoja maestra)
- `01_Menu.gs`                  : menú del proyecto en la hoja
- `05_Admin_Reset.gs`           : utilidades administrativas
- `10_Formulario.gs`            : ingestión y procesamiento de respuestas de Forms
- `15_Reprocesar.gs`            : re-procesado y reindexado
- `20_Data.gs`                  : generación y ensamblado de la hoja `data`
- `30_Manual.gs`                : herramientas manuales de mantenimiento
- `40_Privacidad.gs`            : lógica de privacidad y control de export
- `45_Data_Consent_Booleans.gs` : normalización y corrección de booleanos
- `50_Localizaciones.gs`        : tablas y helpers de `_locations`
- `60_Consentimientos.gs`       : definición y gestión de `_consents`
- `65_SourceReferences.gs`      : gestión de referencias y fuentes
- `70_FormSync.gs`              : sincronización de ediciones de formularios
- `80_GDPR.gs`                  : endpoints y helpers GDPR
- `90_Utils.gs`                 : utilidades generales
- `100_Publicacion.gs`          : construcción de vistas públicas y `doGet`
- `105_PointSpread.gs`          : dispersión determinista de puntos coincidentes
- `110_Export_uMap.gs`          : generación de GeoJSON para uMap
- `120_Export_TV.gs`            : export específico para cliente TV
- `130_Export_API.gs`           : endpoints JSON/manifest
- `140_TV_YouTube_Metadata.gs`  : normalización y metadatos YouTube/TV

Flujo básico de configuración y despliegue
----------------------------------------
1. Registrar la hoja maestra en la configuración (vincular la hoja principal al script).
2. Crear/pegar cada `.gs` en el proyecto de Apps Script correspondiente.
3. Evitar mantener simultáneamente el antiguo monolito y los módulos.
4. Guardar y recargar Google Sheets.
5. Ejecutar desde el menú: `Archipiélago Vivo > Instalar / actualizar activadores`.
6. Autorizar permisos cuando Google lo solicite.
7. Implementar (Deploy) como *Web App* si procede y dar acceso público de lectura; copiar la URL `/exec`.
8. Comprobar y verificar los exports desde `Archipiélago Vivo > Exports · Ver URLs`.

Endpoints y formatos de export
-----------------------------
- `?export=manifest`
- `?export=umap&layer=<isla|canarias>` → GeoJSON `FeatureCollection`
- `?export=tv` → JSON con `videos`, `entities` y `conflicts`

Condiciones y precauciones
--------------------------
- Una entidad se publica si `consent_publication` = Sí, `status` = Activo y `verified` = Sí.
- No exponer directamente hojas sensibles: `data`, `_consents`, `_gdpr`, `form_responses`.
- `doGet` debe servir únicamente vistas derivadas generadas por `100_Publicacion.gs`.
- `105_PointSpread.gs` solo altera coordenadas de presentación; no modifica datos originales.

Ver más detalles y pasos de instalación en `apps-script/src/README.txt`.

---

# Datos

Los datos de referencia utilizados por el sistema se almacenan en:

```text
data/
```

Esta carpeta puede contener:

* esquemas de datos;
* listas de valores permitidos;
* categorías;
* etiquetas;
* configuraciones de referencia;
* ejemplos de datos públicos;
* documentación relacionada con la estructura de `data`.

### Datos privados

Los datos privados introducidos en el sistema **no deben almacenarse en este repositorio**.

El repositorio puede contener únicamente:

* esquemas;
* nombres de campos;
* valores de referencia;
* ejemplos anonimizados;
* documentación técnica.

Nunca deben incluirse:

* contraseñas;
* tokens;
* API keys;
* credenciales;
* datos privados de contacto;
* información personal que no sea necesaria para el funcionamiento público del proyecto.

---

# Imágenes

Las imágenes de las entidades no se almacenan en este repositorio.

Existe un repositorio independiente destinado a las imágenes:

```text
ArchipielagoVivo/img
```

La relación entre los datos y las imágenes se realiza mediante el **ID de la entidad**.

La estructura prevista para las imágenes es:

```text
<ID>/
└── logo.webp
```

Por ejemplo:

```text
123456789/
└── logo.webp
```

El sistema puede utilizar el ID de la entidad para construir la URL correspondiente.

Si `logo.webp` no existe, el sistema podrá determinar que la entidad no dispone de una imagen de perfil válida.

La especificación completa de este sistema se documentará en:

```text
docs/data-model.md
```

---

# Configuración

La configuración reutilizable del proyecto se almacena en:

```text
config/
```

Aquí pueden mantenerse configuraciones que no deberían estar mezcladas directamente con la lógica del código.

Ejemplos:

```text
config/
├── fields/
├── categories/
└── environments/
```

No deben almacenarse aquí secretos ni credenciales.

Los valores sensibles deberán gestionarse mediante los mecanismos de configuración correspondientes de cada plataforma.

---

# Versionado

Este proyecto utiliza **Git** para controlar las versiones del código y de los recursos técnicos.

No se crearán copias independientes del código para cada versión.

Por ejemplo, no se utilizará:

```text
versions/
├── v1/
├── v2/
└── v3/
```

Git mantiene el historial de cambios.

Las versiones estables se identificarán mediante **tags**:

```text
v0.1.0
v0.2.0
v0.3.0
v1.0.0
```

## Convención

Se utilizará una numeración basada en:

```text
MAJOR.MINOR.PATCH
```

### MAJOR

Cambios incompatibles con versiones anteriores.

Ejemplo:

```text
v1.0.0 → v2.0.0
```

### MINOR

Nuevas funcionalidades compatibles con el sistema existente.

Ejemplo:

```text
v0.2.0 → v0.3.0
```

### PATCH

Correcciones o cambios menores.

Ejemplo:

```text
v0.3.0 → v0.3.1
```

Mientras el sistema se encuentre en desarrollo inicial, las versiones `0.x.x` se considerarán versiones de desarrollo.

---

# Changelog

Los cambios importantes se registrarán en:

```text
docs/changelog.md
```

Cada versión deberá indicar, cuando corresponda:

* funcionalidades añadidas;
* funcionalidades modificadas;
* funcionalidades eliminadas;
* correcciones;
* cambios en la estructura de datos;
* cambios que puedan afectar a otros componentes del sistema.

Ejemplo:

```markdown
## v0.3.0

### Añadido

- Sistema de imágenes de perfil.

### Modificado

- Generación de la URL de imagen a partir del ID.

### Corregido

- Validación de registros sin imagen.

### Pendiente

- Sistema de imágenes adicionales.
```

---

# Seguridad

Este repositorio puede ser público o privado según las necesidades del proyecto, pero en ambos casos se aplican las mismas reglas de seguridad.

## Nunca subir

```text
API keys
Tokens
Contraseñas
Credenciales
Cookies
Claves privadas
Datos personales privados
Copias completas de Google Sheets con información privada
```

Antes de hacer un commit se debe comprobar que ningún secreto o dato privado haya sido incluido accidentalmente.

### `.gitignore`

El repositorio deberá excluir archivos locales, temporales y configuraciones sensibles mediante:

```text
.gitignore
```

---

# Documentación

La documentación técnica se encuentra en:

```text
docs/
```

### Documentos previstos

| Documento         | Contenido                        |
| ----------------- | -------------------------------- |
| `architecture.md` | Arquitectura general del sistema |
| `data-model.md`   | Modelo y estructura de datos     |
| `apps-script.md`  | Funcionamiento del Apps Script   |
| `changelog.md`    | Historial de versiones           |

La documentación se actualizará junto con los cambios relevantes del sistema.

---

# Flujo de desarrollo

El flujo básico de trabajo será:

```text
1. Modificar
      ↓
2. Probar
      ↓
3. Revisar
      ↓
4. Commit
      ↓
5. Push
      ↓
6. Tag de versión
```

Los cambios importantes deberán quedar registrados en Git para poder:

* identificar cuándo se introdujo un cambio;
* comparar versiones;
* recuperar una versión anterior;
* localizar errores;
* documentar la evolución del sistema.

---

# Estado del proyecto

**Estado:** desarrollo inicial.

La arquitectura y la estructura del repositorio están sujetas a cambios mientras se desarrolla el sistema.

---

## Principio del repositorio

> **El código explica cómo funciona el sistema.
> Los datos explican qué contiene.
> La documentación explica por qué funciona así.
> Git conserva cómo ha evolucionado.**

---

## Proyecto

**Archipiélago Vivo**

Proyecto de mapeo y documentación del ecosistema vivo de Canarias.

Repositorio técnico:

```text
archipielagovivo-app
```

Repositorio de imágenes:

```text
archipielagovivo-img
```
