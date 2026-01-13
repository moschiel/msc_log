let timer = null;
const cb = document.getElementById("autorefresh");

function start() {
    stop();
    timer = setInterval(() => location.reload(), 3000);
}
function stop() {
    if (timer) clearInterval(timer);
    timer = null;
}

cb.addEventListener("change", () => {
    const url = new URL(window.location.href);
    if (cb.checked) {
        url.searchParams.set("autorefresh", "1");
        window.history.replaceState(null, "", url.toString());
        start();
    } else {
        url.searchParams.delete("autorefresh");
        window.history.replaceState(null, "", url.toString());
        stop();
    }
});

if (cb.checked) start();