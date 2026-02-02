function doPost(e) {
    try {
      // Better parsing of incoming data
      var data = e.postData.contents;
      var body = JSON.parse(data);
  
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Login setup");
      if (!sheet) throw new Error("Sheet 'Login setup' not found");
  
      const rows = sheet.getDataRange().getValues();
  
      // LOGIN logic inside doPost
      if (body.login) {
        const { email, password, companyName } = body.login;
  
        for (let i = 1; i < rows.length; i++) {
          const sheetEmail = String(rows[i][2]).trim();
          const sheetPassword = String(rows[i][3]).trim();
          const sheetCompanyId = String(rows[i][4]).trim();
  
          if (sheetEmail === String(email).trim()) {
            if (sheetPassword !== String(password).trim()) {
              return jsonOutput(false, "Incorrect password");
            }
            if (sheetCompanyId !== String(companyName).trim()) {
              return jsonOutput(false, "Incorrect company ID");
            }
  
            return jsonOutput(true, "Login success", { 
              name: rows[i][0], 
              role: rows[i][1], 
              email: sheetEmail, 
              companyName: sheetCompanyId 
            });
          }
        }
        return jsonOutput(false, "Email not found");
      }
  
      // SIGNUP logic
      if (body.signup) {
        const { name, email, role, password, companyName } = body.signup;
  
        // Create a new sheet for the user with their name
        const newSheet = createUserSheet(name);
  
        // Append the signup information to the Login setup sheet
        sheet.appendRow([name, role, email, password, companyName]);
  
        return jsonOutput(true, "Signup successful");
      }
  
      // LOG ACTIVITY logic
      if (body.logActivity) {
        const { userId, date, revenue, calls, appointments, followUps, noShows, closedDeals, notes, userName } = body.logActivity;
  
        // Find the user by userName
        const userSheet = findUserSheetByUserName(userName);
        if (!userSheet) return jsonOutput(false, "User sheet not found");
  
        // Get the header row (which includes the dates)
        const header = userSheet.getRange(1, 1, 1, userSheet.getLastColumn()).getValues()[0];
  
        // Find the row index of the date in the header
        let rowIndex = -1;
        for (let i = 1; i <= userSheet.getLastRow(); i++) {
          const cellValue = userSheet.getRange(i, 1).getValue();
          if (cellValue === date) {
            rowIndex = i;
            break;
          }
        }
  
        // If the date is not found in the sheet, add it to the first empty row
        if (rowIndex === -1) {
          rowIndex = userSheet.getLastRow() + 1;
          userSheet.appendRow([date, ...new Array(header.length - 1).fill("")]); // Add the date to the first column of the new row
        }
  
        // Now, find the correct column positions
        const newHeader = userSheet.getRange(1, 1, 1, userSheet.getLastColumn()).getValues()[0];
        const columnStart = 2; // Starting from the second column (B)
        const values = [
          revenue, 
          calls, 
          appointments, 
          closedDeals, 
          followUps, 
          noShows, 
          notes
        ];
  
        // Insert the values in the same row next to the date
        userSheet.getRange(rowIndex, columnStart, 1, values.length).setValues([values]);
  
        return jsonOutput(true, "Activity log submitted successfully");
      }
  
      return jsonOutput(false, "Invalid request");
  
    } catch (err) {
      return jsonOutput(false, err.message);
    }
  }
  
  // Utility function to find the user's sheet by userName
  function findUserSheetByUserName(userName) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const userSheet = ss.getSheetByName(userName);
    return userSheet || null; // Return null if sheet doesn't exist
  }
  
  // Function to create a new sheet for the user and set up default fields
  function createUserSheet(userName) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const existingSheet = ss.getSheetByName(userName);
  
    if (existingSheet) {
      return existingSheet; // Sheet already exists, no need to create it again
    }
  
    const newSheet = ss.insertSheet(userName); // Create a new sheet with the user's name
  
    // Add header for dates (will be populated later)
    const dateHeader = ["Date", "Revenue Generated ($)", "Calls Made", "Booked", "Closed Deals", "Follow Ups", "No Shows", "Activity Notes"];
    newSheet.appendRow(dateHeader);
  
    return newSheet;
  }
  
  // Utility function to create JSON response
  function jsonOutput(success, message, data) {
    const output = { success, message };
    if (data) output.data = data;
    return ContentService.createTextOutput(JSON.stringify(output))
      .setMimeType(ContentService.MimeType.JSON);
  }
  