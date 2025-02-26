const PAGES = [
    "intro",
    "setup",
    "file_structure",
    "architecture",
]

function InitSideBar(){
    const SideBar = document.getElementById("SideBar")

    PAGES.forEach(PageName => {
        const Button = document.createElement("div")
        const Title = document.createElement("a")

        Button.id = "Page_" + PageName
        Title.text = PageName

        SideBar.appendChild(Button)
        Button.appendChild(Title)
    })
}

async function InitPage(PageName){
    const ContextContent = document.getElementById("ContextContent");
    // const Url = "documentation/pages/" + PageName + ".html"
    const Url = "documentation/pages/" + PageName + ".html"

    ContextContent.innerHTML = "";

    fetch(Url)
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