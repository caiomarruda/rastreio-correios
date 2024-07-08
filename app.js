document.getElementById('tracking-form').addEventListener('submit', function(event) {
    event.preventDefault();
    const trackingCode = document.getElementById('tracking-code').value;
    const description = document.getElementById('description').value;
    checkAndFetchTrackingInfo(trackingCode, description, false);
});

document.getElementById('update-all').addEventListener('click', function() {
    updateAllCodes();
});

function saveTrackingCode(description, code, status, isUpdate = false) {
    let codes = JSON.parse(localStorage.getItem('trackingCodes')) || [];
    const formattedCode = `**${description}**\n${code} - ${status}`;

    if (isUpdate) {
        const index = codes.findIndex(item => item.includes(`${code} -`));
        if (index !== -1) {
            codes[index] = formattedCode;
        }
    } else {
        codes.push(formattedCode);
    }

    localStorage.setItem('trackingCodes', JSON.stringify(codes));
    loadSavedCodes();
}

function loadSavedCodes() {
    const codesList = document.getElementById('codes-list');
    codesList.innerHTML = '';
    let codes = JSON.parse(localStorage.getItem('trackingCodes')) || [];
    codes.forEach((code, index) => {
        let listItem = document.createElement('li');
        listItem.innerHTML = code.replace(/\*\*(.*?)\*\*/, '<b>$1</b>').replace(/\n/g, '<br>') + 
            ` <button onclick="confirmRemoveCode(${index})">🗑️</button>`;
        codesList.appendChild(listItem);
    });
}

function confirmRemoveCode(index) {
    const confirmRemove = confirm('Deseja remover o item mesmo assim?');
    if (confirmRemove) {
        removeCode(index);
    }
}

function removeCode(index) {
    let codes = JSON.parse(localStorage.getItem('trackingCodes')) || [];
    codes.splice(index, 1);
    localStorage.setItem('trackingCodes', JSON.stringify(codes));
    loadSavedCodes();
}

async function checkAndFetchTrackingInfo(trackingCode, description, skipConfirmation) {
    let codes = JSON.parse(localStorage.getItem('trackingCodes')) || [];
    const existingCode = codes.find(item => item.includes(`${trackingCode} -`));
    if (existingCode) {
        displayError('Código já cadastrado');
        return;
    }
    await fetchTrackingInfo(trackingCode, description, false, skipConfirmation);
}

async function fetchTrackingInfo(trackingCode, description, isUpdate = false, skipConfirmation = false) {
    const corsProxy = 'https://cors-anywhere.herokuapp.com/';
    const endpoint = `${corsProxy}https://www.linkcorreios.com.br/?id=${trackingCode}`;
    try {
        const response = await fetch(endpoint, {
            headers: {
                'origin': window.location.origin,
                'x-requested-with': 'XMLHttpRequest'
            }
        });
        if (!response.ok) {
            throw new Error('Código de rastreamento inválido ou serviço indisponível');
        }
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const result = doc.evaluate('//*[@id="page"]/main/div[4]/div/div/div[1]/div/div/ul/li[1]/b', doc, null, XPathResult.STRING_TYPE, null).stringValue;

        if (!result && !skipConfirmation) {
            const confirmInsert = confirm('Código não localizado, deseja inserir mesmo assim?');
            if (confirmInsert) {
                saveTrackingCode(description, trackingCode, 'Sem informações', isUpdate);
            }
        } else {
            saveTrackingCode(description, trackingCode, result || 'Sem informações', isUpdate);
        }
    } catch (error) {
        displayError(error.message);
    }
}

function displayError(message) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `<p style="color: red;">${message}</p>`;
    resultDiv.style.display = 'block';
}

async function updateAllCodes() {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = `<p>Atualizando...</p>`;
    resultDiv.style.display = 'block';

    let codes = JSON.parse(localStorage.getItem('trackingCodes')) || [];
    for (let i = 0; i < codes.length; i++) {
        const code = codes[i].split('\n')[1].split(' - ')[0];
        const description = codes[i].split('\n')[0].replace(/\*\*(.*?)\*\*/, '$1');
        await fetchTrackingInfo(code, description, true, true);
    }

    resultDiv.style.display = 'none';
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('Service Worker registrado com sucesso:', registration);
            })
            .catch(error => {
                console.log('Falha ao registrar o Service Worker:', error);
            });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadSavedCodes();
    updateAllCodes();
});