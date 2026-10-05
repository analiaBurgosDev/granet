const SUPABASE_URL = "https://vfbsoodqnfucfrmzredo.supabase.co";
const SUPABASE_KEY = "sb_publishable_AzA1TSwwQg5eSKJkGJL2wA_nrjyvaMn";

const clienteSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ============================================================
// NAVEGACIÓN Y PANTALLAS (SPA)
// ============================================================

function navegarA(idPantallaTarget) {
    // 1. Ocultar todas las secciones
    const secciones = document.querySelectorAll(".pantalla-seccion");
    secciones.forEach((sec) => sec.classList.add("seccion-oculta"));

    // 2. Mostrar la pantalla seleccionada
    const pantallaDestino = document.getElementById(idPantallaTarget);
    if (pantallaDestino) {
        pantallaDestino.classList.remove("seccion-oculta");
    }

    // 3. Iluminar ícono del menú inferior correspondiente
    const navItems = document.querySelectorAll(".menu-inferior .nav-item");
    navItems.forEach((item) => {
        item.classList.remove("activo");
        if (item.getAttribute("onclick") && item.getAttribute("onclick").includes(idPantallaTarget)) {
            item.classList.add("activo");
        }
    });

    window.scrollTo(0, 0);
}

// ============================================================
// MODO AUTH (LOGIN / REGISTRO / RECUPERAR)
// ============================================================

let modoAuth = "login";

function cambiarModoAuth(nuevoModo) {
    modoAuth = nuevoModo;

    const tabLogin = document.getElementById("tab-login");
    const tabRegistro = document.getElementById("tab-registro");
    const titulo = document.getElementById("auth-titulo");
    const subtitulo = document.getElementById("auth-subtitulo");
    const boton = document.getElementById("btn-auth-submit");
    const campoPassword = document.getElementById("campo-password");
    const linkOlvido = document.getElementById("link-olvido");
    const textoCambio = document.getElementById("texto-cambio-modo");
    const linkVolver = document.getElementById("link-volver");

    if (nuevoModo === "login") {
        if (tabLogin) tabLogin.classList.add("active");
        if (tabRegistro) tabRegistro.classList.remove("active");
        titulo.textContent = "¡Bienvenido!";
        subtitulo.textContent = "Ingresá tus credenciales para acceder.";
        boton.textContent = "Iniciar Sesión";
        campoPassword.classList.remove("seccion-oculta");
        document.getElementById("auth-password").required = true;
        linkOlvido.classList.remove("seccion-oculta");
        textoCambio.classList.remove("seccion-oculta");
        linkVolver.classList.add("seccion-oculta");
    } else if (nuevoModo === "registro") {
        if (tabRegistro) tabRegistro.classList.add("active");
        if (tabLogin) tabLogin.classList.remove("active");
        titulo.textContent = "Crear nueva cuenta";
        subtitulo.textContent = "Registrate para comenzar a monitorear.";
        boton.textContent = "Registrarme";
        campoPassword.classList.remove("seccion-oculta");
        document.getElementById("auth-password").required = true;
        linkOlvido.classList.add("seccion-oculta");
        textoCambio.classList.add("seccion-oculta");
        linkVolver.classList.add("seccion-oculta");
    } else if (nuevoModo === "recuperar") {
        if (tabLogin) tabLogin.classList.remove("active");
        if (tabRegistro) tabRegistro.classList.remove("active");
        titulo.textContent = "Recuperar contraseña";
        subtitulo.textContent = "Ingresá tu correo y te enviaremos las instrucciones.";
        boton.textContent = "Enviar enlace de recuperación";
        campoPassword.classList.add("seccion-oculta");
        document.getElementById("auth-password").required = false;
        linkOlvido.classList.add("seccion-oculta");
        textoCambio.classList.add("seccion-oculta");
        linkVolver.classList.remove("seccion-oculta");
    }
}

const formularioAuth = document.getElementById("form-auth");

if (formularioAuth) {
    formularioAuth.addEventListener("submit", async function (evento) {
        evento.preventDefault();
        const email = document.getElementById("auth-email").value.trim();
        const password = document.getElementById("auth-password").value;

        if (modoAuth === "login") {
            const { error } = await clienteSupabase.auth.signInWithPassword({ email, password });
            if (error) {
                alert("Error de autenticación: " + error.message);
                return;
            }
            await verificarSesionYRol();
        } else if (modoAuth === "registro") {
            const { data: authData, error: authError } = await clienteSupabase.auth.signUp({ email, password });
            if (authError) {
                alert("Error al registrarse: " + authError.message);
                return;
            }

            if (authData.user) {
                const nuevoCliente = {
                    nombre: email.split("@")[0],
                    apellido: "",
                    tel: "",
                    mail: email,
                    direccion: "",
                    rol: "cliente"
                };
                await clienteSupabase.from("cliente").insert([nuevoCliente]);
                alert("¡Cuenta creada exitosamente!");
                await verificarSesionYRol();
            }
        } else if (modoAuth === "recuperar") {
            const { error } = await clienteSupabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.href
            });
            if (error) {
                alert("Error: " + error.message);
                return;
            }
            alert("¡Correo de recuperación enviado!");
            cambiarModoAuth("login");
        }
    });
}

// ============================================================
// VERIFICAR SESIÓN Y ROL DE USUARIO
// ============================================================

async function verificarSesionYRol() {
    const { data: { user } } = await clienteSupabase.auth.getUser();

    const pantallaLogin = document.getElementById("login");
    const pantallaApp = document.getElementById("pantalla-app");
    const userDisplay = document.getElementById("user-email-display");
    const rolBadge = document.getElementById("user-rol-badge");

    if (!user) {
        if (pantallaLogin) pantallaLogin.classList.remove("seccion-oculta");
        if (pantallaApp) pantallaApp.classList.add("seccion-oculta");
        return;
    }

    if (pantallaLogin) pantallaLogin.classList.add("seccion-oculta");
    if (pantallaApp) pantallaApp.classList.remove("seccion-oculta");

    if (userDisplay) userDisplay.textContent = user.email;

    // Buscar rol en tabla cliente
    const { data: usuario } = await clienteSupabase
        .from("cliente")
        .select("rol")
        .eq("mail", user.email)
        .single();

    let rol = usuario ? (usuario.rol || "cliente") : "cliente";

    if (rolBadge) rolBadge.textContent = rol.toUpperCase();

    aplicarPermisosRol(rol);
    navegarA("home");
    cargarHomeSilos();
}

function aplicarPermisosRol(rol) {
    const elementosAdmin = document.querySelectorAll(".solo-admin");
    elementosAdmin.forEach((el) => {
        if (rol === "admin") {
            el.classList.remove("seccion-oculta");
        } else {
            el.classList.add("seccion-oculta");
        }
    });
}

// ============================================================
// CERRAR SESIÓN
// ============================================================

async function cerrarSesion() {
    const confirmacion = confirm("¿Estás seguro de que deseas cerrar sesión?");
    if (!confirmacion) return;

    await clienteSupabase.auth.signOut();
    alert("Sesión cerrada correctamente.");
    window.location.reload();
}

// ============================================================
// CARGA DINÁMICA DE SILOBOLSAS
// ============================================================

async function cargarHomeSilos() {
    const contenedor = document.getElementById("lista-silos-home");
    if (!contenedor) return;

    try {
        const { data: silos, error } = await clienteSupabase
            .from("silos_bolsa")
            .select("*")
            .order("id", { ascending: false });

        if (error || !silos || silos.length === 0) {
            contenedor.innerHTML = `
                <div class="tarjeta-silo" onclick="verDetalleSilo('Silobolsa N° 1 (Silo de Prueba)')">
                    <div class="silo-info">
                        <h3>Silobolsa 1 (Ejemplo)</h3>
                        <p>🟢 Grano: Soja | Estado Óptimo</p>
                    </div>
                    <span class="flecha">›</span>
                </div>
            `;
            return;
        }

        contenedor.innerHTML = "";
        silos.forEach((silo) => {
            const tarjeta = document.createElement("div");
            tarjeta.classList.add("tarjeta-silo");
            tarjeta.onclick = () => verDetalleSilo(silo.identificacion_silo || `Silobolsa N° ${silo.id}`);

            tarjeta.innerHTML = `
                <div class="silo-info">
                    <h3>${silo.identificacion_silo || 'Silobolsa N° ' + silo.id}</h3>
                    <p>🟢 ${silo.tipo_grano ? 'Grano: ' + silo.tipo_grano.toUpperCase() : 'Estado Activo'}</p>
                </div>
                <span class="flecha">›</span>
            `;
            contenedor.appendChild(tarjeta);
        });
    } catch (e) {
        console.error("Error al cargar silobolsas:", e);
    }
}

function verDetalleSilo(nombreSilo) {
    const titulo = document.getElementById("detalle-silo-titulo");
    if (titulo) titulo.textContent = nombreSilo;

    // Generar valores simulados para lecturas en tiempo real
    document.getElementById("val-temp-1").textContent = (21 + Math.floor(Math.random() * 4)) + "°C";
    document.getElementById("val-temp-2").textContent = (22 + Math.floor(Math.random() * 3)) + "°C";
    document.getElementById("val-temp-3").textContent = (21 + Math.floor(Math.random() * 4)) + "°C";

    document.getElementById("val-hum-1").textContent = (62 + Math.floor(Math.random() * 5)) + "%";
    document.getElementById("val-hum-2").textContent = (63 + Math.floor(Math.random() * 4)) + "%";
    document.getElementById("val-hum-3").textContent = (62 + Math.floor(Math.random() * 5)) + "%";

    navegarA("detalle-silobolsa");
}

// ============================================================
// ADMINISTRACIÓN Y REGISTROS
// ============================================================

const formularioCliente = document.getElementById("form-clientes");
if (formularioCliente) {
    formularioCliente.addEventListener("submit", async function (e) {
        e.preventDefault();
        const nuevoCliente = {
            nombre: document.getElementById("nombre").value,
            apellido: document.getElementById("apellido").value,
            tel: document.getElementById("tel").value,
            mail: document.getElementById("mail").value,
            direccion: document.getElementById("direccion").value,
            rol: document.getElementById("rol").value
        };

        const { error } = await clienteSupabase.from("cliente").insert([nuevoCliente]);
        if (error) alert("Error: " + error.message);
        else {
            alert("Cliente guardado correctamente");
            formularioCliente.reset();
            cargarClientesAdmin();
        }
    });
}

async function cargarClientesAdmin() {
    const contenedor = document.getElementById("contenedor-cliente");
    if (!contenedor) return;

    const { data: clientes } = await clienteSupabase.from("cliente").select("*").order("id", { ascending: false });
    if (!clientes) return;

    contenedor.innerHTML = "";
    clientes.forEach((cli) => {
        const tarjeta = document.createElement("div");
        tarjeta.classList.add("tarjeta-cliente");
        tarjeta.innerHTML = `
            <strong>${cli.nombre} ${cli.apellido}</strong> (${cli.rol})
            <p><small>${cli.mail} | Tel: ${cli.tel}</small></p>
            <button class="btn-eliminar" onclick="eliminarCliente(${cli.id})">Borrar</button>
        `;
        contenedor.appendChild(tarjeta);
    });
}

async function eliminarCliente(id) {
    if (confirm("¿Borrar este cliente?")) {
        await clienteSupabase.from("cliente").delete().eq("id", id);
        cargarClientesAdmin();
    }
}

// INICIALIZAR
document.addEventListener("DOMContentLoaded", () => {
    verificarSesionYRol();
    cargarClientesAdmin();
});

// ============================================================
// SUB-PESTAÑAS (CLIENTES / CAMPOS)
// ============================================================

function cambiarSubpestania(subModo) {
    const tabClientes = document.getElementById("tab-sub-clientes");
    const tabCampos = document.getElementById("tab-sub-campos");
    const vistaClientes = document.getElementById("vista-sub-clientes");
    const vistaCampos = document.getElementById("vista-sub-campos");

    if (subModo === "clientes") {
        if (tabClientes) tabClientes.classList.add("active");
        if (tabCampos) tabCampos.classList.remove("active");
        if (vistaClientes) vistaClientes.classList.remove("seccion-oculta");
        if (vistaCampos) vistaCampos.classList.add("seccion-oculta");
    } else if (subModo === "campos") {
        if (tabCampos) tabCampos.classList.add("active");
        if (tabClientes) tabClientes.classList.remove("active");
        if (vistaCampos) vistaCampos.classList.remove("seccion-oculta");
        if (vistaClientes) vistaClientes.classList.add("seccion-oculta");
        
        // Cargar datos necesarios para campos
        cargarSelectorClientes();
        cargarCamposAdmin();
    }
}

// ============================================================
// CARGAR SELECTOR DE CLIENTES EN FORMULARIO DE CAMPOS
// ============================================================

async function cargarSelectorClientes() {
    const selectClientes = document.getElementById("cliente-id");
    if (!selectClientes) return;

    try {
        const { data: clientes, error } = await clienteSupabase
            .from("cliente")
            .select("id, nombre, apellido")
            .order("nombre", { ascending: true });

        if (error) throw error;

        selectClientes.innerHTML = '<option value="">Seleccionar cliente...</option>';
        clientes.forEach((cli) => {
            const opcion = document.createElement("option");
            opcion.value = cli.id;
            opcion.textContent = `${cli.nombre} ${cli.apellido}`;
            selectClientes.appendChild(opcion);
        });
    } catch (e) {
        console.error("Error al cargar selector de clientes:", e);
    }
}

// ============================================================
// GESTIÓN DE CAMPOS (INSERTAR, LISTAR, ELIMINAR)
// ============================================================

const formularioCampo = document.getElementById("form-campo");
if (formularioCampo) {
    formularioCampo.addEventListener("submit", async function (e) {
        e.preventDefault();

        const nuevoCampo = {
            nombre_campo: document.getElementById("nombre-campo").value,
            ubicacion: document.getElementById("ubicacion").value,
            estado: document.getElementById("estado").value,
            cliente_id: document.getElementById("cliente-id").value
        };

        const { error } = await clienteSupabase.from("campo").insert([nuevoCampo]);
        if (error) {
            alert("Error al guardar el campo: " + error.message);
        } else {
            alert("Campo guardado correctamente.");
            formularioCampo.reset();
            cargarCamposAdmin();
        }
    });
}

async function cargarCamposAdmin() {
    const contenedor = document.getElementById("contenedor-campos");
    if (!contenedor) return;

    try {
        // Traer campos relacionando datos con cliente si está configurado la FK
        const { data: campos, error } = await clienteSupabase
            .from("campo")
            .select("*, cliente(nombre, apellido)")
            .order("id", { ascending: false });

        if (error || !campos || campos.length === 0) {
            contenedor.innerHTML = "<p class='version'>No hay campos registrados.</p>";
            return;
        }

        contenedor.innerHTML = "";
        campos.forEach((cmp) => {
            const clienteNombre = cmp.cliente 
                ? `${cmp.cliente.nombre} ${cmp.cliente.apellido}` 
                : `Cliente ID: ${cmp.cliente_id}`;

            const tarjeta = document.createElement("div");
            tarjeta.classList.add("tarjeta-cliente");
            tarjeta.innerHTML = `
                <strong>🌾 ${cmp.nombre_campo}</strong> (${cmp.estado || 'Activo'})
                <p><small>📍 Ubicación: ${cmp.ubicacion} | 👤 ${clienteNombre}</small></p>
                <button class="btn-eliminar" onclick="eliminarCampo(${cmp.id})">Borrar Campo</button>
            `;
            contenedor.appendChild(tarjeta);
        });
    } catch (e) {
        console.error("Error al cargar campos:", e);
    }
}

async function eliminarCampo(id) {
    if (confirm("¿Estás seguro de borrar este campo?")) {
        const { error } = await clienteSupabase.from("campo").delete().eq("id", id);
        if (error) alert("Error al eliminar: " + error.message);
        else cargarCamposAdmin();
    }
}

// ============================================================
// CARGAR SELECTOR DE CAMPOS EN FORMULARIO DE SILOBOLSAS
// ============================================================

async function cargarSelectorCamposSilo() {
    const selectCampos = document.getElementById("campo-id-silo");
    if (!selectCampos) return;

    try {
        const { data: campos, error } = await clienteSupabase
            .from("campo")
            .select("id, nombre_campo, ubicacion")
            .order("nombre_campo", { ascending: true });

        if (error) throw error;

        selectCampos.innerHTML = '<option value="">Seleccionar campo...</option>';
        
        if (campos && campos.length > 0) {
            campos.forEach((cmp) => {
                const opcion = document.createElement("option");
                opcion.value = cmp.id;
                opcion.textContent = `${cmp.nombre_campo} (${cmp.ubicacion})`;
                selectCampos.appendChild(opcion);
            });
        } else {
            selectCampos.innerHTML = '<option value="">No hay campos registrados</option>';
        }
    } catch (e) {
        console.error("Error al cargar selector de campos:", e);
    }
}

// ============================================================
// GESTIÓN DE SILOBOLSAS (GUARDAR, LISTAR, ELIMINAR)
// ============================================================

const formularioSilobolsa = document.getElementById("form-silobolsa");

if (formularioSilobolsa) {
    formularioSilobolsa.addEventListener("submit", async function (e) {
        e.preventDefault();

        const nuevoSilo = {
            identificacion_silo: document.getElementById("identificacion-sil").value.trim(),
            tipo_grano: document.getElementById("tipo-grano-silo").value,
            capacidad_toneladas: parseFloat(document.getElementById("capacidad-toneladas").value),
            fecha_instalacion: document.getElementById("fecha-instalacion-silo").value,
            estado: document.getElementById("estado-silo").value,
            campo_id: document.getElementById("campo-id-silo").value
        };

        const { error } = await clienteSupabase
            .from("silos_bolsa")
            .insert([nuevoSilo]);

        if (error) {
            alert("Error al guardar la silobolsa: " + error.message);
        } else {
            alert("Silobolsa registrada exitosamente");
            formularioSilobolsa.reset();
            cargarSilobolsasAdmin();
            // Actualizar también la lista en la pantalla principal Home
            if (typeof cargarHomeSilos === "function") {
                cargarHomeSilos();
            }
        }
    });
}

async function cargarSilobolsasAdmin() {
    const contenedor = document.getElementById("contenedor-silobolsas");
    if (!contenedor) return;

    try {
        // Traer silobolsas asociando los datos del campo
        const { data: silos, error } = await clienteSupabase
            .from("silos_bolsa")
            .select("*, campo(nombre_campo)")
            .order("id", { ascending: false });

        if (error || !silos || silos.length === 0) {
            contenedor.innerHTML = "<p class='version'>No hay silobolsas registradas.</p>";
            return;
        }

        contenedor.innerHTML = "";
        silos.forEach((silo) => {
            const nombreCampo = silo.campo ? silo.campo.nombre_campo : `Campo ID: ${silo.campo_id}`;

            const tarjeta = document.createElement("div");
            tarjeta.classList.add("tarjeta-cliente");
            tarjeta.innerHTML = `
                <strong>📦 ${silo.identificacion_silo || 'Silo N° ' + silo.id}</strong> (${silo.estado || 'Activo'})
                <p><small>🌾 Grano: ${silo.tipo_grano ? silo.tipo_grano.toUpperCase() : 'N/D'} | Capacidad: ${silo.capacidad_toneladas || 0} Tn</small></p>
                <p><small>📍 Campo: ${nombreCampo} | Instalado: ${silo.fecha_instalacion || 'N/D'}</small></p>
                <button class="btn-eliminar" onclick="eliminarSilobolsa(${silo.id})">Borrar Silobolsa</button>
            `;
            contenedor.appendChild(tarjeta);
        });
    } catch (e) {
        console.error("Error al cargar silobolsas admin:", e);
    }
}

async function eliminarSilobolsa(id) {
    if (confirm("¿Estás seguro de eliminar esta silobolsa?")) {
        const { error } = await clienteSupabase
            .from("silos_bolsa")
            .delete()
            .eq("id", id);

        if (error) {
            alert("Error al eliminar: " + error.message);
        } else {
            cargarSilobolsasAdmin();
            if (typeof cargarHomeSilos === "function") {
                cargarHomeSilos();
            }
        }
    }
}

function navegarA(idPantallaTarget) {
    // 1. Ocultar todas las secciones
    const secciones = document.querySelectorAll(".pantalla-seccion");
    secciones.forEach((sec) => sec.classList.add("seccion-oculta"));

    // 2. Mostrar la pantalla seleccionada
    const pantallaDestino = document.getElementById(idPantallaTarget);
    if (pantallaDestino) {
        pantallaDestino.classList.remove("seccion-oculta");
    }

    // 3. Cargar datos específicos según la pantalla de destino
    if (idPantallaTarget === "silos") {
        cargarSelectorCamposSilo();
        cargarSilobolsasAdmin();
    } else if (idPantallaTarget === "clientes") {
        cargarClientesAdmin();
    }

    // 4. Iluminar ícono del menú inferior correspondiente
    const navItems = document.querySelectorAll(".menu-inferior .nav-item");
    navItems.forEach((item) => {
        item.classList.remove("activo");
        if (item.getAttribute("onclick") && item.getAttribute("onclick").includes(idPantallaTarget)) {
            item.classList.add("activo");
        }
    });

    window.scrollTo(0, 0);
}

function cambiarSubpestaniaSilos(subModo) {
    const tabSilos = document.getElementById("tab-sub-silos");
    const tabVaras = document.getElementById("tab-sub-varas");
    const vistaSilos = document.getElementById("vista-sub-silos");
    const vistaVaras = document.getElementById("vista-sub-varas");

    if (subModo === "silos") {
        if (tabSilos) tabSilos.classList.add("active");
        if (tabVaras) tabVaras.classList.remove("active");
        if (vistaSilos) vistaSilos.classList.remove("seccion-oculta");
        if (vistaVaras) vistaVaras.classList.add("seccion-oculta");
        
        cargarSelectorCamposSilo();
        cargarSilobolsasAdmin();
    } else if (subModo === "varas") {
        if (tabVaras) tabVaras.classList.add("active");
        if (tabSilos) tabSilos.classList.remove("active");
        if (vistaVaras) vistaVaras.classList.remove("seccion-oculta");
        if (vistaSilos) vistaSilos.classList.add("seccion-oculta");
    }
}