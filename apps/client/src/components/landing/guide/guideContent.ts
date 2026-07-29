/**
 * Contenido de la página `/guia` (UX-50): 9 módulos, sin JSX — solo datos, consumidos por
 * `views/Guia.tsx`. Copy base adaptado de `docs/guia_pagina_landing.html` (fuente de
 * estructura/copy, no de diseño — ese HTML es un standalone editorial que no se usa como UI real)
 * con dos cambios obligatorios: 1) toda mención de "Maison" pasa a "Shear" (nombre real del
 * producto); 2) el tono se acerca al de `views/Landing.tsx` (directo, orientado a beneficio), no
 * al editorial del HTML de referencia. El módulo 9 (`historial`) no existe en el HTML original —
 * redactado a partir de leer `views/Historial.tsx` (listado paginado de 7, con filtros de
 * cliente/servicio/profesional y rango de fechas).
 *
 * Convención de medios: cada módulo sirve su asset desde
 * `apps/client/public/media/<slug-del-modulo>/<archivo>` — el `slug` de cada entrada de
 * `guideModules` ES el nombre de esa carpeta. Los 5 módulos con video (`dashboard`, `clientes`,
 * `servicios`, `inventario`, `turnos`) usan `demo.mp4`. Los otros 4 (`login`, `visitas`,
 * `profesionales`, `historial`) usan capturas reales `.png` subidas en UX-58 (nombres de archivo
 * ad-hoc, no `demo.mp4`, porque son imágenes fijas no grabaciones). El módulo `profesionales`
 * además usa el campo opcional `GuideStep.media` para mostrar una segunda captura
 * (`agregar_profesional.png`) junto al paso de alta de una profesional nueva.
 */

export type ModuleMedia =
    | { kind: 'video'; src: string; poster?: string; alt: string }
    | { kind: 'image'; src: string; alt: string }
    | { kind: 'none' };

export interface GuideStep {
    number: string;
    title: string;
    description: string;
    /** Lista opcional de puntos (ej. las 3 métricas del dashboard). */
    list?: string[];
    /** Aclaración secundaria, más liviana que `description` (ej. "¿Olvidaste tu contraseña?"). */
    soft?: string;
    /** Medio opcional a nivel de paso (UX-58), para pasos que necesitan mostrar una captura
     * distinta de la imagen/video de nivel de módulo (ej. el modal de alta de una profesional).
     * La mayoría de los pasos no lo usa — queda `undefined`. */
    media?: ModuleMedia;
}

export interface GuideCallout {
    label: string;
    text: string;
    /** `alert` reservado para advertencias reales — todos los callouts de esta guía son tips
     * informativos (`default`), no hay ninguna advertencia crítica entre los 9 módulos. */
    variant?: 'default' | 'alert';
}

export interface GuideModule {
    slug: string;
    number: string;
    title: string;
    intro: string;
    media: ModuleMedia;
    steps: GuideStep[];
    callout?: GuideCallout;
}

export const guideModules: GuideModule[] = [
    {
        slug: 'login',
        number: '01',
        title: 'Inicio de sesión',
        intro: 'El primer paso para entrar a Shear. Iniciá sesión con tu email y contraseña, o con un clic usando tu cuenta de Google.',
        media: { kind: 'image', src: '/media/login/login.png', alt: 'Pantalla de inicio de sesión de Shear' },
        steps: [
            {
                number: '01',
                title: 'Ingresá tu email y contraseña',
                description: 'Accedé a la pantalla de inicio de sesión desde el navegador y completá tu correo electrónico junto con la contraseña que configuraste al crear tu cuenta.',
                soft: '¿Olvidaste tu contraseña? Podés recuperarla desde la misma pantalla.',
            },
            {
                number: '02',
                title: 'Iniciá sesión con Google',
                description: 'Si preferís, iniciá sesión con tu cuenta de Google en un solo clic, sin necesidad de recordar ninguna contraseña adicional.',
            },
        ],
        callout: {
            label: 'Buena práctica',
            text: 'Guardá tus credenciales en el navegador si usás una computadora de confianza: la próxima vez vas a poder ingresar con un solo clic.',
        },
    },
    {
        slug: 'dashboard',
        number: '02',
        title: 'Panel principal',
        intro: 'El centro de operaciones de tu estética. Es la primera pantalla que ves al ingresar, con toda la información clave reunida en un solo lugar.',
        media: { kind: 'video', src: '/media/dashboard/demo.mp4', alt: 'Recorrido del panel principal de Shear' },
        steps: [
            {
                number: '01',
                title: 'Métricas rápidas del negocio',
                description: 'En la parte superior encontrás tarjetas con los números más importantes del momento:',
                list: [
                    'Total de clientes registrados',
                    'Servicios realizados hasta la fecha',
                    'Cantidad de próximos retoques programados',
                ],
            },
            {
                number: '02',
                title: 'Próximos retoques con alerta visual',
                description: 'Vas a ver un listado de clientes con retoque programado, ordenados por fecha. A medida que se acerca la fecha, el indicador cambia de color (verde, naranja, rojo) acompañado de un ícono y un texto claro — nunca solo un color.',
            },
            {
                number: '03',
                title: 'Marcar un retoque como completado',
                description: 'Cuando el cliente viene a hacerse el retoque, tocá el ícono de check al lado de su nombre. Eso abre el flujo de registro de visita con los datos precargados, y el sistema calcula automáticamente la fecha del siguiente retoque.',
            },
            {
                number: '04',
                title: 'Próximos turnos',
                description: 'En otro bloque aparecen los próximos turnos agendados en tu estética, ordenados por fecha, para ver rápidamente quién viene hoy, mañana y en los próximos días.',
            },
            {
                number: '05',
                title: 'Últimos movimientos',
                description: 'Un historial cronológico de las últimas visitas registradas, útil como auditoría rápida de lo que se estuvo trabajando en la estética.',
            },
        ],
    },
    {
        slug: 'clientes',
        number: '03',
        title: 'Clientes',
        intro: 'El corazón de tu estética. Acá se guarda toda la información de las personas que atendés: sus datos, notas médicas y el historial completo de visitas.',
        media: { kind: 'video', src: '/media/clientes/demo.mp4', alt: 'Recorrido de la gestión de clientes en Shear' },
        steps: [
            {
                number: '01',
                title: 'Ver el listado de clientes',
                description: 'Desde el menú lateral, entrá a "Clientes" para ver el listado completo, paginado, con todos los clientes cargados en el sistema.',
            },
            {
                number: '02',
                title: 'Buscar un cliente',
                description: 'Usá la barra de búsqueda para filtrar por nombre, apellido o teléfono. Los resultados se actualizan a medida que vas escribiendo.',
            },
            {
                number: '03',
                title: 'Ver el perfil de un cliente',
                description: 'Entrá al perfil completo del cliente: datos personales, notas médicas y todo el historial de servicios que se le realizaron.',
            },
            {
                number: '04',
                title: 'Editar los datos de un cliente',
                description: 'Actualizá datos de contacto, agregá notas médicas o modificá cualquier campo desde la ficha del cliente.',
            },
            {
                number: '05',
                title: 'Agregar un cliente nuevo',
                description: 'Desde el listado, agregá un cliente nuevo completando nombre, apellido, teléfono y notas médicas si corresponde.',
            },
        ],
        callout: {
            label: 'Consejo',
            text: 'Usá el campo de notas médicas para registrar alergias o sensibilidades — vas a evitar sorpresas y tus clientes van a notar la atención al detalle.',
        },
    },
    {
        slug: 'servicios',
        number: '04',
        title: 'Servicios',
        intro: 'Configurá el catálogo de servicios de tu estética. Definir bien los días de retoque es la clave: el sistema calcula solo cuándo debe volver cada cliente.',
        media: { kind: 'video', src: '/media/servicios/demo.mp4', alt: 'Recorrido del catálogo de servicios en Shear' },
        steps: [
            {
                number: '01',
                title: 'Ver el catálogo de servicios',
                description: 'Entrá a "Servicios" para ver todos los que ofrece tu estética en formato de tarjetas: color, corte, alisado, decoloración, y todos los que hayas cargado.',
            },
            {
                number: '02',
                title: 'Editar un servicio',
                description: 'Cambiá el nombre o ajustá los días de retoque configurados. Por ejemplo, si un servicio pasa de 60 a 45 días, el sistema empieza a calcular las próximas alertas con el nuevo valor.',
            },
            {
                number: '03',
                title: 'Agregar un servicio nuevo',
                description: 'Creá un servicio ingresando su nombre y los días de retoque correspondientes. Una vez guardado, ya podés asignarlo a las visitas.',
            },
        ],
        callout: {
            label: 'Por qué importan los días de retoque',
            text: 'Es la funcionalidad estrella del sistema: configurando bien los días de cada servicio, Shear te avisa automáticamente qué clientes tienen que volver y cuándo.',
        },
    },
    {
        slug: 'inventario',
        number: '05',
        title: 'Inventario',
        intro: 'Controlá con precisión el stock de tu estética: qué hay disponible, qué se está por acabar y qué ya no queda.',
        media: { kind: 'video', src: '/media/inventario/demo.mp4', alt: 'Recorrido del control de inventario en Shear' },
        steps: [
            {
                number: '01',
                title: 'Resumen general de inventario',
                description: 'Al entrar a Inventario, lo primero que ves son los indicadores clave:',
                list: [
                    'Total de productos registrados',
                    'Cantidad de productos con stock bajo',
                    'Cantidad de productos sin stock',
                ],
            },
            {
                number: '02',
                title: 'Cargar productos manualmente',
                description: 'Agregá un producto nuevo completando nombre, marca, descripción y stock inicial. Queda disponible de inmediato para usarse en las visitas.',
            },
            {
                number: '03',
                title: 'Carga masiva desde Excel',
                description: 'Si tenés muchos productos, no hace falta cargarlos uno por uno: subí un archivo Excel o CSV y el sistema los importa automáticamente, evitando duplicados.',
            },
            {
                number: '04',
                title: 'Ajustar el stock de un producto',
                description: 'Registrá un ingreso (compra, reposición) o un egreso (pérdida, vencimiento, merma) indicando opcionalmente un motivo. El sistema muestra cuánto stock va a quedar antes de confirmar.',
            },
            {
                number: '05',
                title: 'Editar los detalles de un producto',
                description: 'Modificá nombre, marca o descripción del producto en cualquier momento desde su vista de edición.',
            },
        ],
        callout: {
            label: 'Trazabilidad total',
            text: 'Indicar un motivo cada vez que ajustás stock te da un registro claro de todo lo que entra y sale — información valiosa para entender tus costos reales.',
        },
    },
    {
        slug: 'visitas',
        number: '06',
        title: 'Registro de visitas',
        intro: 'El punto donde se conecta todo: el cliente, el servicio realizado, los insumos consumidos y el próximo retoque, en un solo flujo.',
        media: { kind: 'image', src: '/media/visitas/registar_visitas.png', alt: 'Modal de registro de una nueva visita' },
        steps: [
            {
                number: '01',
                title: 'Iniciar el registro de una nueva visita',
                description: 'Desde el panel principal o desde el perfil de un cliente, abrí el formulario de registro de una nueva visita.',
            },
            {
                number: '02',
                title: 'Seleccionar el cliente y el servicio',
                description: 'Elegí el cliente que estás atendiendo y seleccioná el servicio realizado.',
            },
            {
                number: '03',
                title: 'Fecha del servicio y del próximo retoque',
                description: 'Ingresá la fecha de la visita. El sistema calcula automáticamente el próximo retoque según los días configurados para ese servicio — y podés ajustarlo manualmente si lo necesitás.',
            },
            {
                number: '04',
                title: 'Registrar los insumos consumidos',
                description: 'Agregá los productos usados con su cantidad exacta. Al guardar, el sistema descuenta automáticamente esos productos del inventario.',
            },
            {
                number: '05',
                title: 'Comentarios y notas técnicas',
                description: 'Dejá una nota técnica con la fórmula o los detalles del servicio, para consultarla la próxima vez que ese cliente vuelva.',
            },
            {
                number: '06',
                title: 'Guardar y confirmar la visita',
                description: 'Al guardar, la visita queda en el historial del cliente y en el historial general. El próximo retoque se agrega automáticamente al panel de alertas del dashboard.',
            },
        ],
        callout: {
            label: 'Adiós al cuaderno',
            text: 'Reemplazá las anotaciones a mano: qué le hiciste a cada cliente, con qué productos, en qué fecha y cuándo tiene que volver. Todo queda registrado y accesible en segundos.',
        },
    },
    {
        slug: 'turnos',
        number: '07',
        title: 'Turnos',
        intro: 'Organizá la agenda de tu estética: creá, gestioná y visualizá los turnos por profesional en un calendario claro.',
        media: { kind: 'video', src: '/media/turnos/demo.mp4', alt: 'Recorrido de la agenda de turnos en Shear' },
        steps: [
            {
                number: '01',
                title: 'Ver el calendario de turnos',
                description: 'Entrá a "Turnos" para ver el calendario completo, con vistas por día y por semana según lo que necesites.',
            },
            {
                number: '02',
                title: 'Crear un turno nuevo',
                description: 'Elegí el cliente, el servicio, la profesional y la fecha y hora de inicio. La duración se calcula automáticamente según el servicio elegido.',
            },
            {
                number: '03',
                title: 'Disponibilidad por profesional',
                description: 'Si tenés varias profesionales trabajando en simultáneo, no hay problema: la superposición se valida por profesional, no de forma general para todo el negocio.',
            },
            {
                number: '04',
                title: 'Editar o cancelar un turno',
                description: 'Abrí cualquier turno del calendario para modificar fecha, hora, cliente o servicio, o cancelarlo si es necesario.',
            },
            {
                number: '05',
                title: 'Convertir un turno en visita',
                description: 'Cuando el cliente llegó y se le hizo el servicio, marcá el turno como completado. Se abre el flujo de registro de visita con cliente, servicio, fecha y profesional ya cargados.',
            },
        ],
        callout: {
            label: 'Todo conectado',
            text: 'El turno, la visita y el próximo retoque forman un ciclo automático: agendás una vez, confirmás cuando pasa, y Shear se encarga de recordarte cuándo tiene que volver el cliente.',
        },
    },
    {
        slug: 'profesionales',
        number: '08',
        title: 'Profesionales',
        intro: 'Registrá a las profesionales que atienden en tu estética. Cada una con su propio perfil y color identificador, para asignarles turnos y visitas fácilmente.',
        media: { kind: 'image', src: '/media/profesionales/profesionales.png', alt: 'Listado de profesionales' },
        steps: [
            {
                number: '01',
                title: 'Ver el listado de profesionales',
                description: 'Entrá a "Profesionales" para ver a todas las personas que atienden en tu estética.',
            },
            {
                number: '02',
                title: 'Agregar una profesional nueva',
                description: 'Ingresá su nombre y elegí un color identificador — ese color se muestra en el calendario cada vez que tenga un turno asignado. No necesita usuario ni contraseña propios.',
                media: { kind: 'image', src: '/media/profesionales/agregar_profesional.png', alt: 'Modal de alta de una nueva profesional' },
            },
            {
                number: '03',
                title: 'Asignar profesionales a turnos y visitas',
                description: 'Cada vez que crees un turno o registrés una visita, elegí qué profesional está atendiendo. Así queda registrado en el historial quién hizo cada servicio.',
            },
            {
                number: '04',
                title: 'Desactivar una profesional',
                description: 'Si una profesional deja de trabajar en la estética, desactivala en vez de eliminarla: sus turnos y visitas históricas quedan intactas, pero deja de aparecer como opción para nuevos turnos.',
            },
        ],
    },
    {
        slug: 'historial',
        number: '09',
        title: 'Historial de visitas',
        intro: 'El registro completo de todas las visitas realizadas en tu estética, con filtros para encontrar exactamente lo que buscás.',
        media: { kind: 'image', src: '/media/historial/historial.png', alt: 'Listado de historial de visitas con filtros' },
        steps: [
            {
                number: '01',
                title: 'Ver el listado de visitas registradas',
                description: 'Entrá a "Historial" para ver todas las visitas registradas, paginadas de a 7, con cliente, servicio, fecha, profesional, productos usados y notas.',
            },
            {
                number: '02',
                title: 'Filtrar por cliente, servicio o profesional',
                description: 'Combiná los filtros de cliente, servicio y profesional para acotar el listado a lo que necesitás revisar.',
            },
            {
                number: '03',
                title: 'Filtrar por rango de fechas',
                description: 'Indicá una fecha "desde" y "hasta" para ver solo las visitas realizadas en ese período.',
            },
        ],
        callout: {
            label: 'Auditoría rápida',
            text: 'Combiná los filtros para reconstruir en segundos qué se le hizo a un cliente puntual, o qué trabajó una profesional en un período determinado.',
        },
    },
];
