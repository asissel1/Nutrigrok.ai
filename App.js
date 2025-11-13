const stripe = Stripe('pk_test_...'); // ← your key
const GROK_KEY = 'xai_...'; // ← your key (or use Vercel env)

const $ = id => document.getElementById(id);
let imgB64 = null;

$('photo').onchange = e => {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = ev => {
    imgB64 = ev.target.result;
    $('img').src = imgB64;
    $('preview').classList.remove('hidden');
    $('go').disabled = false;
  };
  reader.readAsDataURL(file);
};

$('go').onclick = async () => {
  if (!imgB64) return;
  $('go').textContent = 'Analyzing...';
  $('go').disabled = true;

  try {
    const meals = await callGrok(imgB64);
    render(meals);
    $('result').classList.remove('hidden');
  } catch (e) {
    alert('Error – try again');
  } finally {
    $('go').textContent = 'Generate Meal Plan';
    $('go').disabled = false;
  }
};

async function callGrok(b64) {
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROK_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'grok-beta',
      messages: [
        { role: 'system', content: 'List 3 healthy meals using ONLY visible ingredients. Return JSON: {meals:[{name,ingredients,calories,steps}]}' },
        { role: 'user', content: [{ type: 'image_url', image_url: { url: b64 } }] }
      ],
      response_format: { type: 'json_object' }
    })
  });
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content).meals;
}

function render(meals) {
  const div = $('meals');
  div.innerHTML = '';
  const grocery = [];
  meals.forEach(m => {
    grocery.push(...m.ingredients);
    div.innerHTML += `
      <div class="bg-white p-5 rounded-xl shadow">
        <h3 class="font-bold text-lg text-green-700">${m.name}</h3>
        <p class="text-sm text-gray-600">${m.calories} cal</p>
        <p class="mt-2"><strong>Ingredients:</strong> ${m.ingredients.join(', ')}</p>
        <ol class="list-decimal ml-5 mt-2 text-sm">${m.steps.map(s=>`<li>${s}</li>`).join('')}</ol>
      </div>`;
  });

  $('pdf').onclick = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Grocery List', 20, 20);
    doc.setFontSize(12);
    [...new Set(grocery)].forEach((item, i) => doc.text(`• ${item}`, 20, 30 + i*8));
    doc.save('grocery.pdf');
  };
}

$('premium').onclick = async () => {
  const email = prompt('Email for premium:');
  if (!email) return;
  const res = await fetch('/api/checkout', { method: 'POST', body: JSON.stringify({ email }), headers: {'Content-Type':'application/json'} });
  const { id } = await res.json();
  stripe.redirectToCheckout({ sessionId: id });
};
