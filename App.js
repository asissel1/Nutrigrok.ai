const stripe = Stripe('pk_test_YOUR_PUBLISHABLE_KEY'); // Replace after setup

const fridgeInput = document.getElementById('fridgePhoto');
const preview = document.getElementById('preview');
const photoPreview = document.getElementById('photoPreview');
const analyzeBtn = document.getElementById('analyzeBtn');
const results = document.getElementById('results');
const mealsContainer = document.getElementById('meals');
const upgradeBtn = document.getElementById('upgradeBtn');
const scanCountEl = document.getElementById('scanCount');
const premiumBadge = document.getElementById('premium-badge');
const logoutBtn = document.getElementById('logout');

// Storage
const STORAGE = {
  isPremium: 'nutrigrok_premium',
  scansLeft: 'nutrigrok_scans',
  userMeals: 'nutrigrok_meals',
  userEmail: 'nutrigrok_email'
};
const FREE_SCANS = 3;
let currentPhoto = null;

// Init
document.addEventListener('DOMContentLoaded', () => {
  updateUI();
  fridgeInput.addEventListener('change', handlePhoto);
  analyzeBtn.addEventListener('click', analyzePhoto);
  upgradeBtn.addEventListener('click', goPremium);
  logoutBtn.addEventListener('click', logout);

  // Auto-upgrade after payment
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('premium') === 'success') {
    localStorage.setItem(STORAGE.isPremium, 'true');
    alert('Premium unlocked! Unlimited scans activated.');
    window.history.replaceState({}, '', '/');
  }
});

function handlePhoto(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    currentPhoto = ev.target.result;
    photoPreview.src = currentPhoto;
    preview.classList.remove('hidden');
    analyzeBtn.disabled = false;
  };
  reader.readAsDataURL(file);
}

async function analyzePhoto() {
  if (!currentPhoto) return;
  const scansLeft = getScansLeft();
  if (!isPremium() && scansLeft <= 0) {
    alert('Upgrade for unlimited scans!');
    return;
  }

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = 'Analyzing...';

  try {
    const response = await fetch('/api/create-checkout', {  // Mock for demo; real uses Grok API
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: currentPhoto })  // In real: Send to Grok API
    });
    const data = await response.json();
    const meals = data.meals || mockMeals();  // Fallback to mock for testing

    displayMeals(meals);
    if (!isPremium()) decrementScan();
    updateUI();
  } catch (err) {
    alert('Try again!');
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'Analyze with Grok AI';
  }
}

function mockMeals() {  // Remove in production
  return [
    { name: 'Avocado Toast', prepTime: '5 min', calories: 300, protein: 10, carbs: 40, fat: 15, ingredients: ['Bread', 'Avocado'], steps: ['Toast bread', 'Mash avocado'] }
  ];
}

function displayMeals(meals) {
  mealsContainer.innerHTML = meals.map(meal => `
    <div class="meal-card bg-white rounded-lg shadow p-5 border">
      <h3 class="font-bold text-lg text-green-700">${meal.name}</h3>
      <p class="text-sm text-gray-600 mt-1">Prep: ${meal.prepTime}</p>
      <div class="mt-3 text-xs">
        <span class="font-medium">${meal.calories} cal</span> • P: ${meal.protein}g • C: ${meal.carbs}g • F: ${meal.fat}g
      </div>
      <details class="mt-3 text-sm">
        <summary class="cursor-pointer font-medium text-green-600">Recipe</summary>
        <p class="mt-2">${meal.ingredients.join(', ')}</p>
        <ol class="list-decimal mt-1 space-y-1">
          ${meal.steps.map(s => `<li>${s}</li>`).join('')}
        </ol>
      </details>
      <button onclick="saveMeal('${meal.name}')" class="mt-3 text-xs text-green-600 underline">Save</button>
    </div>
  `).join('');
  results.classList.remove('hidden');
}

function saveMeal(name) {
  const saved = JSON.parse(localStorage.getItem(STORAGE.userMeals) || '[]');
  if (!saved.includes(name)) saved.push(name);
  localStorage.setItem(STORAGE.userMeals, JSON.stringify(saved));
  alert('Saved!');
}

// Premium Logic
function isPremium() { return localStorage.getItem(STORAGE.isPremium) === 'true'; }
function getScansLeft() { return isPremium() ? Infinity : Math.max(0, FREE_SCANS - parseInt(localStorage.getItem(STORAGE.scansLeft) || '0')); }
function decrementScan() { const used = parseInt(localStorage.getItem(STORAGE.scansLeft) || '0') + 1; localStorage.setItem(STORAGE.scansLeft, used); }
function updateUI() {
  const premium = isPremium();
  const scans = getScansLeft();
  premiumBadge.innerHTML = premium ? '<span class="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold">PREMIUM</span>' : '';
  scanCountEl.textContent = premium ? 'Unlimited scans' : `Scans left: ${scans}/${FREE_SCANS}`;
  logoutBtn.classList.toggle('hidden', !premium);
}

async function goPremium() {
  const email = prompt('Email for premium:');
  if (!email) return;
  localStorage.setItem(STORAGE.userEmail, email);

  const res = await fetch('/api/create-checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const { sessionId } = await res.json();
  stripe.redirectToCheckout({ sessionId });
}

function logout() {
  localStorage.removeItem(STORAGE.isPremium);
  localStorage.removeItem(STORAGE.userEmail);
  updateUI();
  alert('Back to free tier.');
}
