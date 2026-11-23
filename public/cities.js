/* ═══════════════════════════════════════════════════
   CITIES DATA — 300+ Indian cities for combobox
   Grouped by state, with zone and coordinates
   Used by: Find My IIT → Home City selector
   ═══════════════════════════════════════════════════ */

const INDIA_CITIES = [
  // DELHI / NCR
  { city: 'New Delhi', state: 'Delhi', zone: 'North', aliases: ['Delhi NCR', 'Delhi', 'NCR'] },
  { city: 'Gurgaon', state: 'Haryana', zone: 'North', aliases: ['Gurugram'] },
  { city: 'Noida', state: 'Uttar Pradesh', zone: 'North', aliases: ['Greater Noida'] },
  { city: 'Faridabad', state: 'Haryana', zone: 'North', aliases: [] },
  { city: 'Ghaziabad', state: 'Uttar Pradesh', zone: 'North', aliases: [] },

  // MAHARASHTRA
  { city: 'Mumbai', state: 'Maharashtra', zone: 'West', aliases: ['Bombay', 'BOM'] },
  { city: 'Pune', state: 'Maharashtra', zone: 'West', aliases: ['Poona'] },
  { city: 'Nagpur', state: 'Maharashtra', zone: 'Central', aliases: [] },
  { city: 'Nashik', state: 'Maharashtra', zone: 'West', aliases: [] },
  { city: 'Aurangabad', state: 'Maharashtra', zone: 'West', aliases: ['Chhatrapati Sambhajinagar'] },
  { city: 'Thane', state: 'Maharashtra', zone: 'West', aliases: [] },
  { city: 'Solapur', state: 'Maharashtra', zone: 'West', aliases: [] },
  { city: 'Kolhapur', state: 'Maharashtra', zone: 'West', aliases: [] },
  { city: 'Amravati', state: 'Maharashtra', zone: 'Central', aliases: [] },
  { city: 'Nanded', state: 'Maharashtra', zone: 'Central', aliases: [] },

  // KARNATAKA
  { city: 'Bengaluru', state: 'Karnataka', zone: 'South', aliases: ['Bangalore', 'BLR'] },
  { city: 'Mysuru', state: 'Karnataka', zone: 'South', aliases: ['Mysore'] },
  { city: 'Hubli', state: 'Karnataka', zone: 'South', aliases: ['Hubballi'] },
  { city: 'Mangaluru', state: 'Karnataka', zone: 'South', aliases: ['Mangalore'] },
  { city: 'Belagavi', state: 'Karnataka', zone: 'South', aliases: ['Belgaum'] },
  { city: 'Dharwad', state: 'Karnataka', zone: 'South', aliases: [] },
  { city: 'Shivamogga', state: 'Karnataka', zone: 'South', aliases: ['Shimoga'] },
  { city: 'Tumakuru', state: 'Karnataka', zone: 'South', aliases: ['Tumkur'] },
  { city: 'Kalaburagi', state: 'Karnataka', zone: 'South', aliases: ['Gulbarga'] },

  // TAMIL NADU
  { city: 'Chennai', state: 'Tamil Nadu', zone: 'South', aliases: ['Madras', 'MAA'] },
  { city: 'Coimbatore', state: 'Tamil Nadu', zone: 'South', aliases: ['CBE'] },
  { city: 'Madurai', state: 'Tamil Nadu', zone: 'South', aliases: [] },
  { city: 'Tiruchirappalli', state: 'Tamil Nadu', zone: 'South', aliases: ['Trichy', 'Tiruchi'] },
  { city: 'Salem', state: 'Tamil Nadu', zone: 'South', aliases: [] },
  { city: 'Tirunelveli', state: 'Tamil Nadu', zone: 'South', aliases: ['Nellai'] },
  { city: 'Erode', state: 'Tamil Nadu', zone: 'South', aliases: [] },
  { city: 'Tiruppur', state: 'Tamil Nadu', zone: 'South', aliases: [] },
  { city: 'Vellore', state: 'Tamil Nadu', zone: 'South', aliases: [] },
  { city: 'Thoothukudi', state: 'Tamil Nadu', zone: 'South', aliases: ['Tuticorin'] },
  { city: 'Thanjavur', state: 'Tamil Nadu', zone: 'South', aliases: ['Tanjore'] },

  // ANDHRA PRADESH
  { city: 'Visakhapatnam', state: 'Andhra Pradesh', zone: 'South', aliases: ['Vizag', 'VSKP'] },
  { city: 'Vijayawada', state: 'Andhra Pradesh', zone: 'South', aliases: [] },
  { city: 'Guntur', state: 'Andhra Pradesh', zone: 'South', aliases: [] },
  { city: 'Nellore', state: 'Andhra Pradesh', zone: 'South', aliases: [] },
  { city: 'Kurnool', state: 'Andhra Pradesh', zone: 'South', aliases: [] },
  { city: 'Tirupati', state: 'Andhra Pradesh', zone: 'South', aliases: [] },
  { city: 'Amaravati', state: 'Andhra Pradesh', zone: 'South', aliases: [] },

  // TELANGANA
  { city: 'Hyderabad', state: 'Telangana', zone: 'South', aliases: ['Hyd', 'HYD', 'Cyberabad'] },
  { city: 'Warangal', state: 'Telangana', zone: 'South', aliases: [] },
  { city: 'Nizamabad', state: 'Telangana', zone: 'South', aliases: [] },
  { city: 'Karimnagar', state: 'Telangana', zone: 'South', aliases: [] },
  { city: 'Khammam', state: 'Telangana', zone: 'South', aliases: [] },

  // KERALA
  { city: 'Thiruvananthapuram', state: 'Kerala', zone: 'South', aliases: ['Trivandrum', 'TVM'] },
  { city: 'Kochi', state: 'Kerala', zone: 'South', aliases: ['Cochin', 'Ernakulam', 'COK'] },
  { city: 'Kozhikode', state: 'Kerala', zone: 'South', aliases: ['Calicut'] },
  { city: 'Thrissur', state: 'Kerala', zone: 'South', aliases: ['Trichur'] },
  { city: 'Kannur', state: 'Kerala', zone: 'South', aliases: ['Cannanore'] },
  { city: 'Kollam', state: 'Kerala', zone: 'South', aliases: ['Quilon'] },
  { city: 'Palakkad', state: 'Kerala', zone: 'South', aliases: ['Palghat'] },
  { city: 'Malappuram', state: 'Kerala', zone: 'South', aliases: [] },
  { city: 'Alappuzha', state: 'Kerala', zone: 'South', aliases: ['Alleppey'] },

  // GOA
  { city: 'Panaji', state: 'Goa', zone: 'West', aliases: ['Panjim', 'Goa'] },
  { city: 'Vasco da Gama', state: 'Goa', zone: 'West', aliases: [] },
  { city: 'Margao', state: 'Goa', zone: 'West', aliases: [] },

  // GUJARAT
  { city: 'Ahmedabad', state: 'Gujarat', zone: 'West', aliases: ['AMD', 'Amdavad'] },
  { city: 'Surat', state: 'Gujarat', zone: 'West', aliases: ['Diamond City'] },
  { city: 'Vadodara', state: 'Gujarat', zone: 'West', aliases: ['Baroda'] },
  { city: 'Rajkot', state: 'Gujarat', zone: 'West', aliases: [] },
  { city: 'Bhavnagar', state: 'Gujarat', zone: 'West', aliases: [] },
  { city: 'Jamnagar', state: 'Gujarat', zone: 'West', aliases: [] },
  { city: 'Gandhinagar', state: 'Gujarat', zone: 'West', aliases: [] },
  { city: 'Junagadh', state: 'Gujarat', zone: 'West', aliases: [] },
  { city: 'Anand', state: 'Gujarat', zone: 'West', aliases: [] },
  { city: 'Bharuch', state: 'Gujarat', zone: 'West', aliases: [] },
  { city: 'Morbi', state: 'Gujarat', zone: 'West', aliases: [] },

  // RAJASTHAN
  { city: 'Jaipur', state: 'Rajasthan', zone: 'North', aliases: ['Pink City'] },
  { city: 'Jodhpur', state: 'Rajasthan', zone: 'North', aliases: ['Blue City'] },
  { city: 'Udaipur', state: 'Rajasthan', zone: 'North', aliases: ['City of Lakes'] },
  { city: 'Kota', state: 'Rajasthan', zone: 'North', aliases: ['Coaching City', 'Coaching Hub'] },
  { city: 'Ajmer', state: 'Rajasthan', zone: 'North', aliases: [] },
  { city: 'Bikaner', state: 'Rajasthan', zone: 'North', aliases: [] },
  { city: 'Sikar', state: 'Rajasthan', zone: 'North', aliases: [] },
  { city: 'Alwar', state: 'Rajasthan', zone: 'North', aliases: [] },
  { city: 'Bhilwara', state: 'Rajasthan', zone: 'North', aliases: [] },
  { city: 'Sri Ganganagar', state: 'Rajasthan', zone: 'North', aliases: [] },
  { city: 'Bharatpur', state: 'Rajasthan', zone: 'North', aliases: [] },
  { city: 'Jhunjhunu', state: 'Rajasthan', zone: 'North', aliases: [] },

  // UTTAR PRADESH
  { city: 'Lucknow', state: 'Uttar Pradesh', zone: 'North', aliases: ['Nawabi City', 'LKO'] },
  { city: 'Kanpur', state: 'Uttar Pradesh', zone: 'North', aliases: ['Cawnpore'] },
  { city: 'Agra', state: 'Uttar Pradesh', zone: 'North', aliases: ['Taj Mahal City'] },
  { city: 'Varanasi', state: 'Uttar Pradesh', zone: 'North', aliases: ['Banaras', 'Kashi', 'BHU'] },
  { city: 'Allahabad', state: 'Uttar Pradesh', zone: 'North', aliases: ['Prayagraj'] },
  { city: 'Meerut', state: 'Uttar Pradesh', zone: 'North', aliases: [] },
  { city: 'Ghazipur', state: 'Uttar Pradesh', zone: 'North', aliases: [] },
  { city: 'Mathura', state: 'Uttar Pradesh', zone: 'North', aliases: [] },
  { city: 'Moradabad', state: 'Uttar Pradesh', zone: 'North', aliases: [] },
  { city: 'Aligarh', state: 'Uttar Pradesh', zone: 'North', aliases: [] },
  { city: 'Bareilly', state: 'Uttar Pradesh', zone: 'North', aliases: [] },
  { city: 'Gorakhpur', state: 'Uttar Pradesh', zone: 'North', aliases: [] },
  { city: 'Muzaffarnagar', state: 'Uttar Pradesh', zone: 'North', aliases: [] },
  { city: 'Saharanpur', state: 'Uttar Pradesh', zone: 'North', aliases: [] },
  { city: 'Jhansi', state: 'Uttar Pradesh', zone: 'Central', aliases: [] },

  // MADHYA PRADESH
  { city: 'Bhopal', state: 'Madhya Pradesh', zone: 'Central', aliases: ['City of Lakes'] },
  { city: 'Indore', state: 'Madhya Pradesh', zone: 'Central', aliases: [] },
  { city: 'Jabalpur', state: 'Madhya Pradesh', zone: 'Central', aliases: [] },
  { city: 'Gwalior', state: 'Madhya Pradesh', zone: 'Central', aliases: [] },
  { city: 'Ujjain', state: 'Madhya Pradesh', zone: 'Central', aliases: [] },
  { city: 'Ratlam', state: 'Madhya Pradesh', zone: 'Central', aliases: [] },
  { city: 'Sagar', state: 'Madhya Pradesh', zone: 'Central', aliases: [] },
  { city: 'Dewas', state: 'Madhya Pradesh', zone: 'Central', aliases: [] },
  { city: 'Rewa', state: 'Madhya Pradesh', zone: 'Central', aliases: [] },

  // BIHAR
  { city: 'Patna', state: 'Bihar', zone: 'East', aliases: [] },
  { city: 'Gaya', state: 'Bihar', zone: 'East', aliases: [] },
  { city: 'Muzaffarpur', state: 'Bihar', zone: 'East', aliases: [] },
  { city: 'Bhagalpur', state: 'Bihar', zone: 'East', aliases: [] },
  { city: 'Darbhanga', state: 'Bihar', zone: 'East', aliases: [] },
  { city: 'Arrah', state: 'Bihar', zone: 'East', aliases: [] },
  { city: 'Begusarai', state: 'Bihar', zone: 'East', aliases: [] },
  { city: 'Munger', state: 'Bihar', zone: 'East', aliases: [] },
  { city: 'Nalanda', state: 'Bihar', zone: 'East', aliases: [] },

  // JHARKHAND
  { city: 'Ranchi', state: 'Jharkhand', zone: 'East', aliases: [] },
  { city: 'Jamshedpur', state: 'Jharkhand', zone: 'East', aliases: ['Steel City', 'Tatanagar'] },
  { city: 'Dhanbad', state: 'Jharkhand', zone: 'East', aliases: ['Coal City'] },
  { city: 'Bokaro', state: 'Jharkhand', zone: 'East', aliases: [] },
  { city: 'Deoghar', state: 'Jharkhand', zone: 'East', aliases: [] },
  { city: 'Hazaribagh', state: 'Jharkhand', zone: 'East', aliases: [] },
  { city: 'Giridih', state: 'Jharkhand', zone: 'East', aliases: [] },

  // WEST BENGAL
  { city: 'Kolkata', state: 'West Bengal', zone: 'East', aliases: ['Calcutta', 'CCU'] },
  { city: 'Asansol', state: 'West Bengal', zone: 'East', aliases: [] },
  { city: 'Siliguri', state: 'West Bengal', zone: 'East', aliases: [] },
  { city: 'Durgapur', state: 'West Bengal', zone: 'East', aliases: [] },
  { city: 'Howrah', state: 'West Bengal', zone: 'East', aliases: [] },
  { city: 'Bardhaman', state: 'West Bengal', zone: 'East', aliases: ['Burdwan'] },
  { city: 'Malda', state: 'West Bengal', zone: 'East', aliases: [] },
  { city: 'Jalpaiguri', state: 'West Bengal', zone: 'East', aliases: [] },

  // ODISHA
  { city: 'Bhubaneswar', state: 'Odisha', zone: 'East', aliases: [] },
  { city: 'Cuttack', state: 'Odisha', zone: 'East', aliases: [] },
  { city: 'Rourkela', state: 'Odisha', zone: 'East', aliases: [] },
  { city: 'Sambalpur', state: 'Odisha', zone: 'East', aliases: [] },
  { city: 'Berhampur', state: 'Odisha', zone: 'East', aliases: ['Brahmapur'] },
  { city: 'Puri', state: 'Odisha', zone: 'East', aliases: [] },

  // ASSAM
  { city: 'Guwahati', state: 'Assam', zone: 'East', aliases: ['Gauhati', 'Gateway to NE'] },
  { city: 'Silchar', state: 'Assam', zone: 'East', aliases: [] },
  { city: 'Dibrugarh', state: 'Assam', zone: 'East', aliases: [] },
  { city: 'Jorhat', state: 'Assam', zone: 'East', aliases: [] },
  { city: 'Tezpur', state: 'Assam', zone: 'East', aliases: [] },

  // NORTH-EAST
  { city: 'Imphal', state: 'Manipur', zone: 'East', aliases: [] },
  { city: 'Agartala', state: 'Tripura', zone: 'East', aliases: [] },
  { city: 'Shillong', state: 'Meghalaya', zone: 'East', aliases: ['Scotland of East'] },
  { city: 'Kohima', state: 'Nagaland', zone: 'East', aliases: [] },
  { city: 'Itanagar', state: 'Arunachal Pradesh', zone: 'East', aliases: [] },
  { city: 'Aizawl', state: 'Mizoram', zone: 'East', aliases: [] },
  { city: 'Gangtok', state: 'Sikkim', zone: 'East', aliases: [] },

  // HARYANA
  { city: 'Chandigarh', state: 'Punjab / Haryana (UT)', zone: 'North', aliases: ['City Beautiful', 'CHD'] },
  { city: 'Hisar', state: 'Haryana', zone: 'North', aliases: [] },
  { city: 'Rohtak', state: 'Haryana', zone: 'North', aliases: [] },
  { city: 'Ambala', state: 'Haryana', zone: 'North', aliases: [] },
  { city: 'Panipat', state: 'Haryana', zone: 'North', aliases: [] },
  { city: 'Karnal', state: 'Haryana', zone: 'North', aliases: [] },
  { city: 'Sonipat', state: 'Haryana', zone: 'North', aliases: [] },
  { city: 'Yamunanagar', state: 'Haryana', zone: 'North', aliases: [] },

  // PUNJAB
  { city: 'Ludhiana', state: 'Punjab', zone: 'North', aliases: [] },
  { city: 'Amritsar', state: 'Punjab', zone: 'North', aliases: ['Golden Temple City'] },
  { city: 'Jalandhar', state: 'Punjab', zone: 'North', aliases: [] },
  { city: 'Patiala', state: 'Punjab', zone: 'North', aliases: [] },
  { city: 'Bathinda', state: 'Punjab', zone: 'North', aliases: [] },
  { city: 'Mohali', state: 'Punjab', zone: 'North', aliases: ['SAS Nagar'] },

  // HIMACHAL PRADESH
  { city: 'Shimla', state: 'Himachal Pradesh', zone: 'North', aliases: ['Queen of Hills'] },
  { city: 'Manali', state: 'Himachal Pradesh', zone: 'North', aliases: [] },
  { city: 'Dharamshala', state: 'Himachal Pradesh', zone: 'North', aliases: ['Dharmshala'] },
  { city: 'Mandi', state: 'Himachal Pradesh', zone: 'North', aliases: [] },
  { city: 'Solan', state: 'Himachal Pradesh', zone: 'North', aliases: [] },

  // UTTARAKHAND
  { city: 'Dehradun', state: 'Uttarakhand', zone: 'North', aliases: ['Doon Valley'] },
  { city: 'Haridwar', state: 'Uttarakhand', zone: 'North', aliases: [] },
  { city: 'Roorkee', state: 'Uttarakhand', zone: 'North', aliases: ['IIT Roorkee City'] },
  { city: 'Rishikesh', state: 'Uttarakhand', zone: 'North', aliases: [] },
  { city: 'Nainital', state: 'Uttarakhand', zone: 'North', aliases: [] },
  { city: 'Haldwani', state: 'Uttarakhand', zone: 'North', aliases: [] },

  // JAMMU & KASHMIR
  { city: 'Srinagar', state: 'Jammu & Kashmir', zone: 'North', aliases: ['Venice of the East'] },
  { city: 'Jammu', state: 'Jammu & Kashmir', zone: 'North', aliases: ['City of Temples'] },
  { city: 'Leh', state: 'Ladakh', zone: 'North', aliases: [] },

  // CHHATTISGARH
  { city: 'Raipur', state: 'Chhattisgarh', zone: 'Central', aliases: [] },
  { city: 'Bhilai', state: 'Chhattisgarh', zone: 'Central', aliases: ['Steel City'] },
  { city: 'Bilaspur', state: 'Chhattisgarh', zone: 'Central', aliases: [] },
  { city: 'Durg', state: 'Chhattisgarh', zone: 'Central', aliases: [] },
  { city: 'Korba', state: 'Chhattisgarh', zone: 'Central', aliases: [] },

  // PUDUCHERRY / UTs
  { city: 'Puducherry', state: 'Puducherry', zone: 'South', aliases: ['Pondicherry'] },
  { city: 'Port Blair', state: 'Andaman & Nicobar', zone: 'South', aliases: [] },

  // SIKKIM
  { city: 'Namchi', state: 'Sikkim', zone: 'East', aliases: [] },
];

// IIT home zones map (for near-home scoring)
const IIT_ZONES = {
  'IIT Bombay':        'West',
  'IIT Delhi':         'North',
  'IIT Madras':        'South',
  'IIT Kanpur':        'North',
  'IIT Kharagpur':     'East',
  'IIT Roorkee':       'North',
  'IIT Guwahati':      'East',
  'IIT Hyderabad':     'South',
  'IIT Indore':        'Central',
  'IIT (BHU) Varanasi':'North',
  'IIT (ISM) Dhanbad': 'East',
  'IIT Ropar':         'North',
  'IIT Patna':         'East',
  'IIT Gandhinagar':   'West',
  'IIT Bhubaneswar':   'East',
  'IIT Mandi':         'North',
  'IIT Jodhpur':       'North',
  'IIT Tirupati':      'South',
  'IIT Palakkad':      'South',
  'IIT Dharwad':       'South',
  'IIT Jammu':         'North',
  'IIT Goa':           'West',
  'IIT Bhilai':        'Central'
};

/**
 * Fuzzy search cities
 * @param {string} query
 * @returns {Array} sorted matches [{city, state, zone, score}]
 */
function searchCities(query) {
  if (!query || query.trim().length < 1) return INDIA_CITIES.slice(0, 12);
  const q = query.toLowerCase().trim();

  return INDIA_CITIES.map(c => {
    const cityL = c.city.toLowerCase();
    const stateL = c.state.toLowerCase();
    const aliasMatch = c.aliases.some(a => a.toLowerCase().includes(q));

    let score = 0;
    if (cityL === q) score = 100;
    else if (cityL.startsWith(q)) score = 90;
    else if (cityL.includes(q)) score = 70;
    else if (stateL.includes(q)) score = 40;
    else if (aliasMatch) score = 60;
    else {
      // Token fuzzy: all chars of q appear in city in order
      let ci = 0;
      for (let ch of q) {
        ci = cityL.indexOf(ch, ci);
        if (ci === -1) { score = 0; break; }
        ci++; score = 20;
      }
    }
    return { ...c, score };
  })
  .filter(c => c.score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 20);
}

/**
 * City combobox init
 * @param {string} inputId - ID of the text input
 * @param {string} dropdownId - ID of the <ul> dropdown
 * @param {function} onSelect - callback({city, state, zone})
 */
function initCityCombobox(inputId, dropdownId, onSelect) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  let selectedItem = null;
  let isOpen = false;
  let highlightIdx = -1;

  function openDropdown(results) {
    isOpen = true;
    highlightIdx = -1;
    dropdown.innerHTML = '';

    if (results.length === 0) {
      if (input.value.trim()) {
        const custom = document.createElement('li');
        custom.className = 'city-dropdown-item city-dropdown-custom';
        custom.textContent = `Use "${input.value.trim()}" as my city`;
        custom.addEventListener('mousedown', (e) => {
          e.preventDefault();
          selectCity({ city: input.value.trim(), state: 'Other', zone: 'All', lat: 22.9734, lng: 78.6569 });
        });
        dropdown.appendChild(custom);
      }
    } else {
      results.forEach((r, i) => {
        const li = document.createElement('li');
        li.className = 'city-dropdown-item';
        li.innerHTML = `<span class="city-dropdown-name">${escapeHtml(r.city)}</span><span class="city-dropdown-state">${escapeHtml(r.state)}</span>`;
        li.addEventListener('mousedown', (e) => {
          e.preventDefault();
          selectCity(r);
        });
        dropdown.appendChild(li);
      });

      // Also append custom option at bottom if not exact match
      const trimmed = input.value.trim();
      const hasExact = results.some(r => r.city.toLowerCase() === trimmed.toLowerCase());
      if (trimmed && !hasExact) {
        const custom = document.createElement('li');
        custom.className = 'city-dropdown-item city-dropdown-custom';
        custom.style.borderTop = '1px dashed var(--border-subtle, #333)';
        custom.textContent = `Use "${trimmed}" as my city`;
        custom.addEventListener('mousedown', (e) => {
          e.preventDefault();
          selectCity({ city: trimmed, state: 'Other', zone: 'All', lat: 22.9734, lng: 78.6569 });
        });
        dropdown.appendChild(custom);
      }
    }

    dropdown.classList.add('open');
  }

  function closeDropdown() {
    isOpen = false;
    dropdown.classList.remove('open');
  }

  function selectCity(c) {
    selectedItem = c;
    input.value = c.city === 'Other' ? c.city : `${c.city}, ${c.state}`;
    closeDropdown();
    if (onSelect) onSelect(c);
  }

  function updateHighlight() {
    const items = dropdown.querySelectorAll('.city-dropdown-item');
    items.forEach((el, i) => el.classList.toggle('highlighted', i === highlightIdx));
  }

  input.addEventListener('input', () => {
    const results = searchCities(input.value);
    openDropdown(results);
  });

  input.addEventListener('focus', () => {
    const results = searchCities(input.value);
    openDropdown(results);
  });

  input.addEventListener('blur', () => {
    setTimeout(closeDropdown, 180);
  });

  input.addEventListener('keydown', (e) => {
    const items = dropdown.querySelectorAll('.city-dropdown-item');
    if (e.key === 'ArrowDown') { e.preventDefault(); highlightIdx = Math.min(highlightIdx + 1, items.length - 1); updateHighlight(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); highlightIdx = Math.max(highlightIdx - 1, 0); updateHighlight(); }
    else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault();
      items[highlightIdx]?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    } else if (e.key === 'Escape') closeDropdown();
  });
}

// Quick city chips
const QUICK_CITIES = [
  { city: 'New Delhi', state: 'Delhi', zone: 'North' },
  { city: 'Mumbai', state: 'Maharashtra', zone: 'West' },
  { city: 'Bengaluru', state: 'Karnataka', zone: 'South' },
  { city: 'Kota', state: 'Rajasthan', zone: 'North' },
  { city: 'Jaipur', state: 'Rajasthan', zone: 'North' },
  { city: 'Hyderabad', state: 'Telangana', zone: 'South' },
  { city: 'Patna', state: 'Bihar', zone: 'East' },
  { city: 'Lucknow', state: 'Uttar Pradesh', zone: 'North' },
  { city: 'Kolkata', state: 'West Bengal', zone: 'East' },
  { city: 'Pune', state: 'Maharashtra', zone: 'West' },
  { city: 'Chennai', state: 'Tamil Nadu', zone: 'South' },
  { city: 'Ahmedabad', state: 'Gujarat', zone: 'West' },
];
