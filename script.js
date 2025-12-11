const querystring = window.location.search;
const urlParameters = new URLSearchParams(querystring);

const colorFondo = urlParameters.get("fondoColor") || "#000";
const opacity = urlParameters.get("opacidad") || 0;
const showAvatar = obtenerBooleanos("mostarAvatar", true);
const showUsername = obtenerBooleanos("mostrarUsuario", true);
const showBadges = obtenerBooleanos("mostrarInsigneas", true);
const mensajesAgrupados = obtenerBooleanos("mensajesAgrupados", true); 
let ocultarDespuesDe = urlParameters.get("tiempoMs") || 0;
const excludeCommands = obtenerBooleanos("excluirComandos", true);
const fuenteLetra = urlParameters.get("fuenteLetra") || "'Fjalla One', sans-serif";
let fontSize = urlParameters.get("tamanoFuente") || "32";
const ignoredUsers = urlParameters.get("usuariosIgnorados") || "";
const StreamerbotPort = urlParameters.get('portInput') || '8080';
const StreamerbotAddress = urlParameters.get('hostInput') || '127.0.0.1';

const maxMessages = 20;
let ultimoUsuario = '';
let zIndexCounter = 9999;
let zigzagState = false;

const client = new StreamerbotClient({
    host: StreamerbotAddress,
    port: StreamerbotPort,
    onConnect: (data) =>{
        setConnectionStatus(true);
    },
    onDisconnect: () =>{
        setConnectionStatus(false);
    }
});

const hexToRgb = (hex) => {
  const cleanHex = hex.replace("#", "");
  const bigint = parseInt(cleanHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
};

const { r, g, b } = hexToRgb(colorFondo);
document.body.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${opacity})`;
document.body.style.fontFamily = fuenteLetra;
document.body.style.fontSize = `${fontSize}px`;

let listaMensajes = document.getElementById("listaMensajes");

client.on('Twitch.ChatMessage', (response) => {
    MensajeChat(response.data);
});

client.on('Twitch.ChatCleared', (response) => {
    LimpiarChat(response.data);
});

client.on('Twitch.UserBanned', (response) => {
    UsuarioBaneado(response.data);
});

client.on('Twitch.UserTimedOut', (response) => {
    UsuarioBaneado(response.data);
});

async function MensajeChat(data) {
    const usuario = data.user.name;
    const colorUsuario = data.user.color || "#D12025";
    const mensaje = data.text;
    const msgId = data.messageId;
    const uid = data.message.userId;
    const esRespuesta = data.message.isReply;

    if (data.message.message.startsWith("!") && excludeCommands) return;
    if (ignoredUsers.includes(usuario)) return;

    const plantilla = document.getElementById("plantillaMensaje");
    const instancia = plantilla.content.cloneNode(true);
    
    const rowDiv = instancia.querySelector(".mensaje-row");
    const portraitBg = instancia.querySelector(".portrait-bg");
    const avatarImg = instancia.querySelector(".avatar-img");
    const usernameText = instancia.querySelector(".username-text");
    const badgesContainer = instancia.querySelector(".badges-container");
    const messageContent = instancia.querySelector(".message-content");
    const replyInfo = instancia.querySelector(".reply-info");
    const replyName = instancia.querySelector(".reply-name");
    const connector = instancia.querySelector(".zigzag-connector");

    portraitBg.style.backgroundColor = colorUsuario;
    usernameText.style.color = colorUsuario;

    if (usuario === "DesarolladorCheems") {
        usernameText.style.color = "#3BE477";
        portraitBg.style.backgroundColor = "#3BE477";
    }

    if (showUsername) usernameText.innerText = usuario;

    if (showBadges && data.message.badges) {
        data.message.badges.forEach(badge => {
            const img = document.createElement("img");
            img.src = badge.imageUrl;
            img.classList.add("badge");
            badgesContainer.appendChild(img);
        });
    }

    if (showAvatar) {
        const url = await obtenerAvatar(usuario);
        avatarImg.src = url;
    }

    if (esRespuesta && data.message.reply) {
        replyInfo.style.display = "block";
        replyName.innerText = data.message.reply.userName;
    }

    let mensajeFinal = html_encode(mensaje);
    if(data.emotes) {
        data.emotes.forEach(emote => {
            const img = `<img src="${emote.imageUrl}" class="emote"/>`;
            const regex = new RegExp(`\\b${EscapeRegExp(emote.name)}\\b`, 'g');
            mensajeFinal = mensajeFinal.replace(regex, img);
        });
    }
    messageContent.innerHTML = mensajeFinal;

    if (mensajesAgrupados && listaMensajes.children.length > 0) {
        if (ultimoUsuario === uid) {
            rowDiv.classList.add("agrupado");
            const tail = instancia.querySelector(".speech-bubble-tail");
            if (tail) tail.style.display = "none";

            zigzagState = !zigzagState;
            if(zigzagState) connector.classList.add("zig-right");
            else connector.classList.add("zig-left");

        } else {
            zigzagState = false;
        }
    } else {
        zigzagState = false;
    }

    ultimoUsuario = uid;

    const li = document.createElement("li");
    li.id = msgId;
    li.dataset.uid = uid;
    
    li.style.zIndex = zIndexCounter;
    zIndexCounter--;

    li.appendChild(instancia);
    listaMensajes.appendChild(li);

    const mainContainer = document.getElementById("mainContainer");
    if (mainContainer) mainContainer.scrollTop = mainContainer.scrollHeight;

    while (listaMensajes.children.length > maxMessages) {
        listaMensajes.removeChild(listaMensajes.firstChild);
    }

    if (ocultarDespuesDe > 0) {
        setTimeout(() => {
            const el = document.getElementById(msgId);
            if(el) {
                const row = el.querySelector(".mensaje-row");
                if(row) row.classList.add("hide-anim");
                setTimeout(() => el.remove(), 500);
            }
        }, ocultarDespuesDe * 1000);
    }
}

function LimpiarChat(data) {
    listaMensajes = document.getElementById("listaMensajes");
    listaMensajes.innerHTML = "";
}

function UsuarioBaneado(data) {
    listaMensajes = document.getElementById("listaMensajes");
    const userId = String(data.user_id);
    
    for (let i = listaMensajes.children.length - 1; i >= 0; i--) {
        const li = listaMensajes.children[i];
        if (li.dataset.uid === userId) {
            const row = li.querySelector('.mensaje-row');
            if(row) row.classList.add("hide-anim");
            setTimeout(() => li.remove(), 500);
        }
    }
}

function html_encode(e) {
    return e.replace(/[<>"^]/g, function (e) {
        return "&#" + e.charCodeAt(0) + ";";
    });
}

function EscapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function obtenerAvatar(username){
    try {
        let response = await fetch('https://decapi.me/twitch/avatar/'+username);
        if(response.ok) return await response.text();
        return "https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-300x300.png";
    } catch (e) {
        return ""; 
    }
}

function obtenerBooleanos(parametro, valorDefecto){
    const urlParams = new URLSearchParams(window.location.search);
    const valorParametro = urlParams.get(parametro);
    if(valorParametro === null) return valorDefecto;
    if(valorParametro === 'true') return true;
    if(valorParametro === 'false') return false;
    return valorDefecto;
}

function setConnectionStatus(connected){
    let statusContainer = document.getElementById('status-container');
    if(!statusContainer) return;
    
    if(connected){
        statusContainer.style.opacity = 0;
        setTimeout(() => statusContainer.style.display = 'none', 1000);
    } else {
        statusContainer.style.display = 'block';
        statusContainer.innerText = "PHANTOM THIEVES OFFLINE...";
        statusContainer.style.opacity = 1;
    }
}


const mockMessage = {
  user: {
    name: "PhantomFox",
    color: "#D12025"
  },
  text: "¡Esto es un mensaje de prueba! PogChamp Wow increíble!",
  message: {
    userId: "123456789",
    badges: [
      { imageUrl: "https://static-cdn.jtvnw.net/badges/v1/fc2c2b36-df3b-4e2b-a480-5f49229cf3d4/3" }, // Verified
      { imageUrl: "https://static-cdn.jtvnw.net/badges/v1/b3d243c6-4f9f-4d20-af04-5f15ad168a34/3" }  // Twitch Turbo
    ],
    message: "¡Esto es un mensaje de prueba! PogChamp Wow increíble!",
    isReply: false,
    reply: {
      userName: "Morgana"
    }
  },
  emotes: [
    {
      name: "PogChamp",
      imageUrl: "https://static-cdn.jtvnw.net/emoticons/v2/305954156/default/dark/3.0"
    },
    {
      name: "Wow",
      imageUrl: "https://static-cdn.jtvnw.net/emoticons/v2/111700/default/dark/3.0"
    }
  ],
  messageId: "test-msg-001"
};

//MensajeChat(mockMessage);
