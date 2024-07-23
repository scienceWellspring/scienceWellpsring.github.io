const API_KEY = 'AIzaSyDfGOC10awrLoJJZnDxexGNqEp5Tac7Eyk';
const SHEET_ID = '15EpnaUc9XztfPNtPAYAjorv2j87Lb9sIlAFdTpS1mJE';
const SHEET_NAME = 'ICT_lab';
const SHEET_URL = `https://script.google.com/macros/s/AKfycbyHZhOQ2fn-HeNOL_pvumRYUuMMHSMWwy9nfVtpn-wTGuki4nwQCjhi84nkzJZv7UP8/exec`;

const roomBookings = [
    { room: 'ICT Lab 1', bookings: [] },
    { room: 'ICT Lab 2', bookings: [] },
    { room: 'ICT Lab 3', bookings: [] },
    { room: 'ICT Lab 4', bookings: [] }
];

let bookedIctLabs = [];

document.addEventListener('DOMContentLoaded', () => {
    setMinDate();
    renderBookingTable();
    loadSheetData();
});

function loadSheetData() {
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`)
        .then(response => response.json())
        .then(data => {
            console.log('Fetched data:', data);
            const rows = data.values;
            if (rows && rows.length > 1) {
                bookedIctLabs = []; // Clear old data
                rows.slice(1).forEach(row => { // Skip header row
                    const [name, room, date, period] = row;
                    if (name && room && date && period) {
                        bookedIctLabs.push({ name, room, date, period });
                    }
                });
                console.log('Booked ICT Labs:', bookedIctLabs);
                renderBookedTable();
                renderBookingTable(); // Update availability after loading data
            }
        })
        .catch(error => {
            console.error('Error loading data from the sheet:', error);
        });
}

function setMinDate() {
    const dateInput = document.getElementById('date');
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    dateInput.setAttribute('min', today);
}

function saveToSheet(name, room, date, period, action) {
    const data = new URLSearchParams();
    data.append('name', name);
    data.append('room', room);
    data.append('date', date);
    data.append('period', period);
    data.append('status', action);

    fetch(SHEET_URL, {
        method: 'POST',
        body: data
    }).then(response => response.json())
      .then(result => {
          console.log('Data saved to sheet:', result);
      }).catch(error => {
          console.error('Error saving data to sheet:', error);
      });
}

function removeFromSheet(name, room, date, period) {
    saveToSheet(name, room, date, period, 'remove');
}

function renderBookingTable() {
    const bookingTable = document.getElementById('bookingTable');
    bookingTable.innerHTML = '';

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    roomBookings.forEach(room => {
        const row = document.createElement('tr');
        const roomCell = document.createElement('td');
        roomCell.textContent = room.room;
        row.appendChild(roomCell);

        daysOfWeek.forEach(day => {
            const dayCell = document.createElement('td');
            const bookings = bookedIctLabs.filter(booking => booking.room === room.room && getDayOfWeek(booking.date) === day);
            if (bookings.length === 0) {
                dayCell.textContent = 'Available';
            } else {
                dayCell.innerHTML = `Booked<br>Periods: ${bookings.map(b => b.period).join(', ')}`;
            }
            row.appendChild(dayCell);
        });

        bookingTable.appendChild(row);
    });
}

function bookIctLab(room, date, period, name) {
    const day = getDayOfWeek(date);

    if (bookedIctLabs.some(booking => booking.room === room && booking.date === date && booking.period === period)) {
        alert(`${room} is not available for the selected day and period.`);
        return;
    }

    bookedIctLabs.push({ room, date, period, name });
    renderBookingTable();
    renderBookedTable();
    saveToSheet(name, room, date, period, 'active');
}

function getDayOfWeek(date) {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const d = new Date(date);
    return daysOfWeek[d.getDay()];
}

function renderBookedTable() {
    const bookedTable = document.getElementById('bookedTable').getElementsByTagName('tbody')[0];
    bookedTable.innerHTML = '';

    bookedIctLabs.forEach(booking => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${booking.name}</td>
            <td>${booking.room}</td>
            <td>${booking.date}</td>
            <td>${booking.period}</td>
            <td><button onclick="cancelBooking('${booking.name}', '${booking.room}', '${booking.date}', '${booking.period}')">Cancel</button></td>
        `;
        bookedTable.appendChild(row);
    });
}

function cancelBooking(name, room, date, period) {
    if (!confirm('Are you sure you want to cancel this booking?')) {
        return;
    }

    bookedIctLabs = bookedIctLabs.filter(b => !(b.room === room && b.date === date && b.period === period && b.name === name));

    renderBookingTable();
    renderBookedTable();
    removeFromSheet(name, room, date, period);
}

document.getElementById('bookingForm').addEventListener('submit', (event) => {
    event.preventDefault();

    const name = document.getElementById('name').value;
    const room = document.getElementById('room').value;
    const date = document.getElementById('date').value;
    const period = document.getElementById('period').value;

    bookIctLab(room, date, period, name);
});
