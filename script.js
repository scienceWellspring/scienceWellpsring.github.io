const CLIENT_ID = '637088412101-furdfq5r6cbg31f6kkt2g9n2cr7k9kit.apps.googleusercontent.com';
const API_KEY = 'AIzaSyDfGOC10awrLoJJZnDxexGNqEp5Tac7Eyk';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';
const SPREADSHEET_ID = '15EpnaUc9XztfPNtPAYAjorv2j87Lb9sIlAFdTpS1mJE';
const SHEET_NAME = 'data_lab';

const roomBookings = [
    { room: 'ICT Lab 1', bookings: [] },
    { room: 'ICT Lab 2', bookings: [] },
    { room: 'ICT Lab 3', bookings: [] },
    { room: 'ICT Lab 4', bookings: [] }
];

let bookedIctLabs = [];
let gapiInited = false;
let gisInited = false;
let tokenClient;

document.addEventListener('DOMContentLoaded', () => {
    setMinDate();
    renderBookingTable();
    // gapi will be initialized in onLoadCallback function
});

function onLoadCallback() {
    gapi.load('client:auth2', () => {
        gapi.client.init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            scope: SCOPES
        }).then(() => {
            gapiInited = true;
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: (response) => {
                    if (response.error) {
                        console.error('Error during authentication:', response.error);
                        return;
                    }
                    loadSheetData();
                },
            });
            google.accounts.id.initialize({
                client_id: CLIENT_ID,
                callback: handleCredentialResponse
            });
            google.accounts.id.prompt(); // Display the One Tap UI
        }).catch(error => {
            console.error('Lỗi khi khởi tạo GAPI client:', error);
        });
    });
}

function handleCredentialResponse(response) {
    if (response.credential) {
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

function loadSheetData() {
    if (!gapiInited) return;
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: SHEET_NAME,
    }).then(response => {
        const rows = response.result.values;
        if (rows && rows.length > 1) {
            bookedIctLabs.length = 0;
            rows.slice(1).forEach(row => {
                const [name, room, date, period] = row;
                if (name && room && date && period) {
                    bookedIctLabs.push({ name, room, date, period });
                }
            });
            renderBookedTable();
        }
    }).catch(error => {
        console.error('Lỗi khi tải dữ liệu từ bảng tính:', error);
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

function saveToSheet(name, room, date, period) {
    if (!gapiInited) return;
    const values = [[name, room, date, period]];
    gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: SHEET_NAME,
        valueInputOption: 'RAW',
        resource: { values },
    }).then(response => {
        console.log('Data saved to sheet:', response);
    }).catch(error => {
        console.error('Lỗi khi lưu dữ liệu vào bảng tính:', error);
    });
}

function removeFromSheet(name, room, date, period) {
    if (!gapiInited) return;
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: SHEET_NAME,
    }).then(response => {
        const values = response.result.values.filter(row => !(row[0] === name && row[1] === room && row[2] === date && row[3] === period));
        gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: SHEET_NAME,
            valueInputOption: 'RAW',
            resource: { values },
        }).then(response => {
            console.log('Sheet updated:', response);
        }).catch(error => {
            console.error('Lỗi khi cập nhật bảng tính:', error);
        });
    }).catch(error => {
        console.error('Lỗi khi lấy dữ liệu từ bảng tính:', error);
    });
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
            const bookings = room.bookings.filter(booking => booking.day === day);
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
    const roomBooking = roomBookings.find(b => b.room === room);
    const day = getDayOfWeek(date);

    if (roomBooking.bookings.some(booking => booking.day === day && booking.period === period)) {
        alert(`${room} is not available for the selected day and period.`);
        return;
    }

    roomBooking.bookings.push({ day, date, period, name });
    bookedIctLabs.push({ room, date, period, name });
    renderBookingTable();
    renderBookedTable();
    saveToSheet(name, room, date, period);
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

    const roomBooking = roomBookings.find(b => b.room === room);
    const day = getDayOfWeek(date);

    roomBooking.bookings = roomBooking.bookings.filter(b => !(b.day === day && b.period === period && b.name === name));
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
