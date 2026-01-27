let timer = null;
const btnAutoRefresh = document.getElementById("btnAutoRefresh");

function startAutoRefresh() {
    stopAutoRefresh();
    timer = setInterval(() => location.reload(), 3000);
}
function stopAutoRefresh() {
    if (timer) clearInterval(timer);
    timer = null;
}

btnAutoRefresh.addEventListener("click", () => {
    const url = new URL(window.location.href);

    const isPressed = util.toogleOnOffButton(btnAutoRefresh);
    if (isPressed) {
        url.searchParams.set("autorefresh", "1");
        window.history.replaceState(null, "", url.toString());
        startAutoRefresh();
    } else {
        url.searchParams.delete("autorefresh");
        window.history.replaceState(null, "", url.toString());
        stopAutoRefresh();
    }
});

if (util.isOnOffButtonPressed(btnAutoRefresh)) 
    startAutoRefresh();