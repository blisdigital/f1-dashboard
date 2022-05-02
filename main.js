
let currentNavItem = 'classification';

const today = new Date();
for (const race of races) {
    if (Date.parse(race.start) <= today && Date.parse(race.end) >= today) {
        currentNavItem = race.name;
    }
}

races.splice(0, 0, { name: "classification", title: "Klassement" });

function detectUrlHash() {
    if (!!window.location.hash) {
        const hash = window.location.hash.split("#")[1];
        if (!!hash
            && (hash === "classification"
                || results.hasOwnProperty(hash))) {
            currentNavItem = hash;
        }
    }

    if (currentNavItem === "classification") {
        loadClassification(results);
        buildResultsNav();
    } else if (results.hasOwnProperty(currentNavItem)) {
        loadResults(results[currentNavItem]);
        buildResultsNav();
    }
}

function toSeconds(timeStr) {
    if (!timeStr) {
        return 0;
    }

    const hmsParts = timeStr.split(":");
    let hours = 0;
    let minutes = 0;
    let seconds = 0.0;

    if (hmsParts.length === 0) {
        seconds = parseFloat(timeStr);
        secMsStr = timeStr;
    } else if (hmsParts.length === 1) {
        seconds = parseFloat(hmsParts[0]);
        secMsStr = hmsParts[0];
    } else if (hmsParts.length === 2) {
        minutes = parseInt(hmsParts[0]);
        seconds = parseFloat(hmsParts[1]);
    } else if (hmsParts.length === 3) {
        hours = parseInt(hmsParts[0]);
        minutes = parseInt(hmsParts[1]);
        seconds = parseFloat(hmsParts[2]);
    }

    return (hours * 60 * 60) + (minutes * 60) + seconds;
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    seconds = seconds % 60;

    let result = "";
    if (!!hours) {
        result += (hours < 10 ? "0" + hours : hours) + ":";
    }

    if (!!hours || !!minutes) {
        result += (minutes < 10 ? "0" + minutes : minutes) + ":";
    }

    result += (!!hours || !!minutes) && seconds < 10 ? "0" + seconds.toFixed(3) : seconds.toFixed(3);
    return result;
}

function orderResults(results) {
    results = results.slice();

    for (const result of results) {
        if (result.time === "DNS" || result.time === "DNF") {
             continue;
        }

        result.timeInSeconds = toSeconds(result.time);
    }

    results.sort(function(a, b) {
        if (!a.timeInSeconds && !b.timeInSeconds) {
            return 0;
        } else if (!!a.timeInSeconds && !b.timeInSeconds) {
            return -1;
        } else if (!a.timeInSeconds && !!b.timeInSeconds) {
            return 1;
        }

        return a.timeInSeconds < b.timeInSeconds ? -1 : 1;
    });

    let prevTimeInSeconds = 0;
    results.fastestInLeague = [];
    for (let i = 0; i < results.length; i++) {
        const result = results[i];
        result.position = i + 1;
        
        const driver = drivers[result.driver];

        if (!!prevTimeInSeconds) {
            result.deltaInSeconds = result.timeInSeconds - prevTimeInSeconds;
        } else {
            result.deltaInSeconds = 0;
        }

        if (!!result.timeInSeconds
            && (!results.fastestInLeague.hasOwnProperty(driver.league.name)
                || result.timeInSeconds < results.fastestInLeague[driver.league.name].timeInSeconds)) {
                    results.fastestInLeague[driver.league.name] = result;
        }

        result.points = !!result.timeInSeconds ? points[i] || 0 : 0;

        prevTimeInSeconds = result.timeInSeconds;
    }

    return results;
}

function loadResults(results) {
    const container = document.getElementById("results-container");
    container.innerHTML = "";

    const table = document.createElement("table");
    table.classList.add("results__table");

    const thead = document.createElement("thead");
    thead.innerHTML = "<tr>"
        + "<th>#</th>"
        + "<th>League</th>"
        + "<th>Naam</th>"
        + "<th>Snelste rondetijd</th>"
        + "<th>Delta</th>"
        + "<th>Totale delta</th>"
        + "<th>Simulator</th>"
        + "<th>Compound</th>"
        + "<th>Punten</th>"
        + "</tr>";
    table.append(thead);

    const tbody = document.createElement("tbody");

    for (const driverName in drivers) {
        const driver = drivers[driverName];
        
        const result = results.filter(function(r) { return r.driver === driverName })[0];
        if (!result) {
            results.push({
                driver: driverName,
                simulator: "",
                points: 0
            });
        }
    }

    const orderedResults = orderResults(results);
    let totalDeltaInSeconds = 0;

    for (const result of orderedResults) {
        const driver = drivers[result.driver];

        const row = document.createElement("tr");
        if (!result.timeInSeconds) {
            row.classList.add("results__row--no-time");
        }
        
        // #
        let col = document.createElement("td");
        col.classList.add("results__pos");
        col.innerHTML = result.position;
        row.append(col);

        // League
        col = document.createElement("td");
        col.classList.add("results__league");
        col.innerText = driver.league.title;
        row.append(col);

        // Naam
        col = document.createElement("td");
        col.classList.add("results__name");
        col.innerText = result.driver;
        row.append(col);

        // Rondetijd
        col = document.createElement("td");
        col.classList.add("results__time");
        col.innerText = !!result.time ? result.time : (result.time === "DNS" ? "DNS" : "NTB");
        if (orderedResults.fastestInLeague[driver.league.name] && orderedResults.fastestInLeague[driver.league.name] === result) {
            col.classList.add("results__time--fastest");
        }

        row.append(col);

        // Delta
        col = document.createElement("td");
        col.classList.add("results__delta");
        col.innerText = !!result.deltaInSeconds && !!result.timeInSeconds ? "+" + formatTime(result.deltaInSeconds) : '';
        totalDeltaInSeconds += result.deltaInSeconds;
        row.append(col);

        // Totale delta
        col = document.createElement("td");
        col.classList.add("results__total-delta");
        col.innerText = !!totalDeltaInSeconds && !!result.timeInSeconds ? "+" + formatTime(totalDeltaInSeconds) : "";
        row.append(col);

        // Simulator
        col = document.createElement("td");
        col.classList.add("results__simulator");
        col.innerText = result.simulator;
        row.append(col);

        // Compound
        col = document.createElement("td");
        col.classList.add("results__tyre");
        if (!!result.tyre) {
            const tyre = document.createElement("span");
            tyre.classList.add("tyre", "tyre--" + result.tyre);
            tyre.title = result.tyre;
            col.append(tyre);
        }

        row.append(col);

        // Punten
        col = document.createElement("td");
        col.classList.add("results__points");
        col.innerText = result.points;
        row.append(col);

        tbody.append(row);
    }

    table.append(tbody);

    container.append(table);
}

function loadClassification(results) {
    const container = document.getElementById("results-container");
    container.innerHTML = "";

    const table = document.createElement("table");
    table.classList.add("results__table");

    const thead = document.createElement("thead");
    thead.innerHTML = "<tr>"
        + "<th>#</th>"
        + "<th>League</th>"
        + "<th>Naam</th>"
        + "<th>Totale rondetijd</th>"
        + "<th>Delta</th>"
        + "<th>Totale delta</th>"
        + "<th>Totale punten</th>"
        + "</tr>";
    table.append(thead);

    const tbody = document.createElement("tbody");

    const driverTotals = [];
    for (const round in results) {
        const orderedResults = orderResults(results[round]);
        for (const result of orderedResults) {
            const driver = drivers[result.driver];

            if (!driverTotals.hasOwnProperty(result.driver)) {
                driverTotals[result.driver] = {
                    driver: result.driver,
                    league: driver.league,
                    totalTimeInSeconds: result.timeInSeconds,
                    totalPoints: result.points
                };
            } else {
                driverTotals[result.driver].totalTimeInSeconds += result.timeInSeconds;
                driverTotals[result.driver].totalPoints += result.points;
            }
        }
    }

    driverTotals.sort(function(a, b) {
        return a.totalPoints - b.totalPoints;
    });

    let position = 1;
    let prevTotalTimeInSeconds = 0;
    let totalDeltaInSeconds = 0;
    for (const driverName in driverTotals) {
        const driverClassification = driverTotals[driverName];
        const driver = drivers[driverClassification.driver];
        
        const row = document.createElement("tr");
        row.classList.add("results__row");
        if (position === 1) {
            row.classList.add("results__row--gold");
        } else if (position === 2) {
            row.classList.add("results__row--silver");
        } else if (position === 3) {
            row.classList.add("results__row--bronze");
        } else if (!driverClassification.totalTimeInSeconds) {
            row.classList.add("results__row--no-time");
        }
        
        // #
        let col = document.createElement("td");
        col.classList.add("results__pos");
        col.innerText = position;
        row.append(col);
        
        // League
        col = document.createElement("td");
        col.classList.add("results__league");
        col.innerText = driver.league.title;
        row.append(col);
        
        // Naam
        col = document.createElement("td");
        col.classList.add("results__name");
        col.innerText = driverClassification.driver;
        row.append(col);

        // Totale rondetijd
        col = document.createElement("td");
        col.classList.add("results__time");
        col.innerText = !!driverClassification.totalTimeInSeconds ? formatTime(driverClassification.totalTimeInSeconds) : "";
        row.append(col);

        // Delta
        col = document.createElement("td");
        col.classList.add("results__delta");
        const deltaInSeconds =  !!prevTotalTimeInSeconds && !!driverClassification.totalTimeInSeconds ? driverClassification.totalTimeInSeconds - prevTotalTimeInSeconds : 0;
        totalDeltaInSeconds += deltaInSeconds;
        col.innerText = !!prevTotalTimeInSeconds && !!driverClassification.totalTimeInSeconds
            ? "+" + formatTime(deltaInSeconds)
            : "";
        row.append(col);

        // Totale delta
        col = document.createElement("td");
        col.classList.add("results__total-delta");
        col.innerText = !!totalDeltaInSeconds && !!driverClassification.totalTimeInSeconds ? "+" + formatTime(totalDeltaInSeconds) : "";
        row.append(col);

        // Totale punten
        col = document.createElement("td");
        col.classList.add("results__total-points");
        col.innerText = driverClassification.totalPoints;
        row.append(col);

        tbody.append(row);

        position++;
        prevTotalTimeInSeconds = driverClassification.totalTimeInSeconds;
    }

    table.append(tbody);

    container.append(table);
}

function buildResultsNav() {
    const navContainer = document.getElementById("results-nav");
    navContainer.innerHTML = "";

    for (const race of races) {
        const navItem = document.createElement("li");
        navItem.classList.add("results__nav-item");
        if (race.name === currentNavItem) {
            navItem.classList.add("results__nav-item--active");
        }

        const a = document.createElement("a");
        a.href = "#"+ race.name;
        a.innerText = race.title;
        navItem.append(a);

        navContainer.append(navItem);
    }
}

window.onload = function() {
    window.addEventListener("hashchange", detectUrlHash);
    detectUrlHash();
    buildResultsNav();
};
