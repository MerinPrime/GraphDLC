const xhr = new XMLHttpRequest();
xhr.open('GET', chrome.extension.getURL('index.js'), false);
xhr.send(null);

const patchCode = xhr.responseText;

function injectScript(code) {
    const script = document.createElement('script');
    script.textContent = code;
    document.documentElement.appendChild(script);
    script.remove();
}

const observer = new MutationObserver(() => {
    if (document.documentElement) {
        observer.disconnect();
        injectScript(patchCode);
    }
});

observer.observe(document, { childList: true, subtree: true });