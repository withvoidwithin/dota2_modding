// Получаем данные, которые сборщик запишет в window.DATA
const ALL_MODIFIERS = window.DATA;

const listElement = document.getElementById('list');
const searchInput = document.getElementById('search');
const countElement = document.getElementById('count');

function render(data) {
    countElement.textContent = `Total: ${data.length}`;
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < data.length; i++) {
        const li = document.createElement('li');
        li.className = 'modifier-item';
        li.textContent = data[i];
        fragment.appendChild(li);
    }
    listElement.innerHTML = '';
    listElement.appendChild(fragment);
}

searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = ALL_MODIFIERS.filter(m => m.toLowerCase().includes(query));
    render(filtered);
});

render(ALL_MODIFIERS);