const PAGES = {
    intro: {
        HTML: "documentation/pages/intro.html",
        LocalizationName: "О проекте",
    },
    dota_class_viewer: {
        HTML: "documentation/pages/dota_class_viewer/main.html",
        LocalizationName: "Dota Class Viewer",
    },
    setup: {
        LocalizationName: "Установка и настройка",
        IsInDev: true,
    },
    resources: {
        LocalizationName: "Полезные ресурсы",
        IsInDev: true,
    },
    file_structure: {
        LocalizationName: "Структура файлов",
        IsInDev: true,
    },
    architecture: {
        LocalizationName: "Архитектура",
        IsInDev: true,
    },
}

function InitSideBar(){
    const SideBar = document.getElementById("SideBar")

    for (let PageName in PAGES){
        const PageData = PAGES[PageName]
        const Button = document.createElement("div")
        const Title = document.createElement("a")

        Title.text = PageData.LocalizationName
        Button.id = "Page_" + PageName
        Button.onclick = () => InitPage(PageName)

        if(PageData.IsInDev) Button.classList.add('IsInDev')

        SideBar.appendChild(Button)
        Button.appendChild(Title)
    }
}

async function InitPage(PageName){
    const ContextContent = document.getElementById("ContextContent");
    const PageData = PAGES[PageName]

    console.log(PageData);

    if (window.location.protocol === "file:") return

    ContextContent.innerHTML = "";

    fetch(PageData.HTML)
        .then(response => response.text())
        .then(data => {
            ContextContent.innerHTML = data;
        })
        .catch(error => {
            console.error("Error loading the HTML file:", error);
        });
}

InitSideBar()
InitPage("intro")