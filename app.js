// Grand Team frontend. Only the Supabase publishable key belongs here.
const SUPABASE_URL = "https://ytebcoaglmssphbeykhl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_AjM05BrDNdMcNnnlipNp5A_babiW8gD";
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const $ = (id) => document.getElementById(id);
let authMode = "login";
let currentUser = null;
const syntheticEmail = (username) => username.trim().toLowerCase() + "@accounts.grandteam.invalid";

function toast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2600);
}
function showModal(id) { $(id).classList.remove("hidden"); }
function hideModal(id) { $(id).classList.add("hidden"); }
function setAuthMode(mode) {
  authMode = mode;
  $("tabLogin").classList.toggle("selected", mode === "login");
  $("tabRegister").classList.toggle("selected", mode === "register");
  $("emailWrap").classList.toggle("hidden", mode !== "register");
  $("authTitle").textContent = mode === "login" ? "С возвращением" : "Создать аккаунт";
  $("authSubtitle").textContent = mode === "login" ? "Войди в свой аккаунт Grand Team." : "Имя пользователя и пароль обязательны. Почта — по желанию.";
  $("authSubmit").textContent = mode === "login" ? "Войти" : "Зарегистрироваться";
  $("authPassword").autocomplete = mode === "login" ? "current-password" : "new-password";
  $("authMessage").textContent = "";
  $("authMessage").classList.remove("error");
}
function openAuth(mode) { setAuthMode(mode); showModal("authModal"); }
function safeText(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

async function refreshSession() {
  const { data } = await db.auth.getSession();
  currentUser = data.session?.user ?? null;
  $("loginOpen").classList.toggle("hidden", !!currentUser);
  $("registerOpen").classList.toggle("hidden", !!currentUser);
  $("profileButton").classList.toggle("hidden", !currentUser);
  if (currentUser) {
    const { data: profile } = await db.from("profiles").select("username").eq("id", currentUser.id).maybeSingle();
    $("profileButton").textContent = (profile?.username || currentUser.user_metadata?.username || "U").slice(0,1).toUpperCase();
    $("profileButton").title = profile?.username || "Профиль";
  }
}
async function loadListings() {
  const grid = $("listingGrid");
  let query = db.from("listings").select("id,title,description,price,created_at,category_id,categories(name)").eq("status","active").order("created_at",{ascending:false}).limit(30);
  const term = $("searchInput").value.trim();
  if (term) query = query.ilike("title", "%" + term.replace(/[%_]/g,"") + "%");
  const category = $("categoryFilter").value;
  if (category) query = query.eq("categories.name", category);
  const { data, error } = await query;
  if (error) { grid.innerHTML = '<div class="empty-state">Не удалось загрузить каталог. Проверь подключение и политики базы данных.</div>'; return; }
  if (!data?.length) { grid.innerHTML = '<div class="empty-state">Пока нет опубликованных объявлений.<br>Стань первым — размести своё предложение.</div>'; return; }
  grid.innerHTML = data.map(item => `<article class="listing-card"><span class="listing-tag">${safeText(item.categories?.name || "Предложение")}</span><h3>${safeText(item.title)}</h3><p>${safeText(item.description || "Описание не добавлено.")}</p><div class="listing-meta"><span>${new Date(item.created_at).toLocaleDateString("ru-RU")}</span><strong class="listing-price">${Number(item.price) === 0 ? "Договорная" : Number(item.price).toLocaleString("ru-RU")}</strong></div></article>`).join("");
}

$("loginOpen").addEventListener("click", () => openAuth("login"));
$("registerOpen").addEventListener("click", () => openAuth("register"));
$("heroRegister").addEventListener("click", () => openAuth("register"));
$("tabLogin").addEventListener("click", () => setAuthMode("login"));
$("tabRegister").addEventListener("click", () => setAuthMode("register"));
$("createListing").addEventListener("click", () => {
  if (!currentUser) return openAuth("login");
  showModal("listingModal");
});
$("profileButton").addEventListener("click", async () => {
  if (confirm("Выйти из аккаунта Grand Team?")) {
    await db.auth.signOut(); await refreshSession(); toast("Ты вышел из аккаунта.");
  }
});
document.querySelectorAll("[data-close]").forEach(btn => btn.addEventListener("click", () => {
  hideModal("authModal"); hideModal("listingModal");
}));
document.querySelectorAll(".modal").forEach(modal => modal.addEventListener("click", e => {
  if (e.target === modal) hideModal(modal.id);
}));
$("searchInput").addEventListener("input", loadListings);
$("categoryFilter").addEventListener("change", loadListings);

$("authForm").addEventListener("submit", async e => {
  e.preventDefault();
  const username = $("authUsername").value.trim();
  const password = $("authPassword").value;
  const email = $("authEmail").value.trim();
  const message = $("authMessage");
  message.classList.remove("error"); message.textContent = "Проверяем данные...";
  if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) {
    message.classList.add("error"); message.textContent = "Имя: 3–24 символа, только латинские буквы, цифры и _."; return;
  }
  try {
    if (authMode === "register") {
      const { data, error } = await db.auth.signUp({
        email: syntheticEmail(username), password,
        options: { data: { username, contact_email: email || null } }
      });
      if (error) throw error;
      if (!data.user) throw new Error("Не удалось создать аккаунт.");
      message.textContent = "Аккаунт создан. Проверяем профиль...";
      await refreshSession();
      await loadListings();
      hideModal("authModal");
      toast("Добро пожаловать в Grand Team!");
    } else {
      const { error } = await db.auth.signInWithPassword({ email: syntheticEmail(username), password });
      if (error) throw error;
      await refreshSession(); hideModal("authModal"); toast("Вход выполнен.");
    }
  } catch (err) {
    message.classList.add("error");
    message.textContent = err.message || "Не удалось выполнить операцию.";
  }
});

$("listingForm").addEventListener("submit", async e => {
  e.preventDefault();
  if (!currentUser) return;
  const message = $("listingMessage"); message.classList.remove("error"); message.textContent = "Отправляем...";
  const categoryName = $("listingCategory").value;
  const { data: category, error: catError } = await db.from("categories").select("id").eq("name",categoryName).single();
  if (catError) { message.classList.add("error"); message.textContent = "Не найдена категория."; return; }
  const { error } = await db.from("listings").insert({
    user_id: currentUser.id, category_id: category.id,
    title: $("listingName").value.trim(), description: $("listingDescription").value.trim(),
    price: Number($("listingPrice").value), status: "pending"
  });
  if (error) { message.classList.add("error"); message.textContent = error.message; return; }
  hideModal("listingModal"); $("listingForm").reset(); toast("Объявление отправлено на модерацию.");
});

$("year").textContent = new Date().getFullYear();
db.auth.onAuthStateChange(() => { refreshSession(); });
(async () => { await refreshSession(); await loadListings(); })();