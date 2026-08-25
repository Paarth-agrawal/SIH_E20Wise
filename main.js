// E20Wise Dashboard Logic

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const cityHighwaySlider = document.getElementById('city_driving_percent');
    const drivingSplitVal = document.getElementById('driving-split-val');
    const profilerForm = document.getElementById('profiler-form');
    const feedbackForm = document.getElementById('feedback-form');
    
    const selectModel = document.getElementById('vehicle_model');
    const selectFbModel = document.getElementById('fb_vehicle_model');
    
    // Result elements
    const scoreVal = document.getElementById('score-val');
    const scoreCircle = document.getElementById('score-circle');
    const scoreStatus = document.getElementById('score-status');
    const dropVal = document.getElementById('drop-val');
    const baseMileageVal = document.getElementById('base-mileage-val');
    const e20MileageVal = document.getElementById('e20-mileage-val');
    const confidenceVal = document.getElementById('confidence-val');
    const savingsBadge = document.getElementById('savings-badge');
    const co2Badge = document.getElementById('co2-badge');
    const treesVal = document.getElementById('trees-val');
    const annualCostRegular = document.getElementById('annual-cost-regular');
    const annualCostE20 = document.getElementById('annual-cost-e20');
    const checklistContainer = document.getElementById('checklist-container');
    const btnAnalyse = document.getElementById('btn-analyse');
    
    // Table and national stats
    const regionalTableBody = document.getElementById('regional-table-body');
    const totalReportsVal = document.getElementById('total-reports-val');
    const avgNationalDropVal = document.getElementById('avg-national-drop-val');
    
    let financialChart = null;
    let vehiclesData = [];

    // Helper: update slider label
    cityHighwaySlider.addEventListener('input', (e) => {
        const city = e.target.value;
        const highway = 100 - city;
        drivingSplitVal.textContent = `${city}% City / ${highway}% Highway`;
    });

    // Initialize Chart.js
    function initFinancialChart(regularCost = 0, e20Cost = 0) {
        const ctx = document.getElementById('financialChart').getContext('2d');
        
        if (financialChart) {
            financialChart.destroy();
        }

        financialChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Regular Petrol', 'E20 Petrol (Subsidised)'],
                datasets: [{
                    label: 'Annual Fuel Bill (₹)',
                    data: [regularCost, e20Cost],
                    backgroundColor: [
                        'rgba(79, 172, 254, 0.4)',
                        'rgba(0, 230, 118, 0.4)'
                    ],
                    borderColor: [
                        '#4facfe',
                        '#00e676'
                    ],
                    borderWidth: 1.5,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` ₹${context.raw.toLocaleString('en-IN')}`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#94a3b8',
                            callback: function(value) {
                                return '₹' + (value >= 1000 ? (value/1000) + 'k' : value);
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    }
                }
            }
        });
    }

    // Load available models
    async function loadModels() {
        try {
            const res = await fetch('/api/models');
            const data = await res.json();
            vehiclesData = data;
            
            // Clear existing
            selectModel.innerHTML = '<option value="" disabled selected>Select Model</option>';
            selectFbModel.innerHTML = '<option value="" disabled selected>Select Model</option>';
            
            data.forEach(model => {
                const opt = document.createElement('option');
                opt.value = model.name;
                opt.textContent = model.name;
                selectModel.appendChild(opt);
                
                const optFb = document.createElement('option');
                optFb.value = model.name;
                optFb.textContent = model.name;
                selectFbModel.appendChild(optFb);
            });
        } catch (err) {
            console.error("Error loading models:", err);
        }
    }

    // Autofill form inputs when model is selected
    selectModel.addEventListener('change', (e) => {
        const selected = vehiclesData.find(v => v.name === e.target.value);
        if (selected) {
            document.getElementById('engine_cc').value = selected.avg_engine_cc;
            document.getElementById('transmission_type').value = selected.transmission;
            document.getElementById('current_mileage').value = selected.typical_mileage;
            
            // Set reasonable manufacture year
            const midYear = Math.round((selected.min_year + selected.max_year) / 2);
            document.getElementById('vehicle_year').value = midYear;
        }
    });

    // Populate regional analytics database
    async function loadRegionalData() {
        try {
            const res = await fetch('/api/regions');
            const data = await res.json();
            
            // Render table
            regionalTableBody.innerHTML = '';
            
            let totalReports = 0;
            let sumDrops = 0;
            
            data.forEach(row => {
                totalReports += row.reports_count;
                sumDrops += row.avg_mileage_drop_pct * row.reports_count;
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${row.region}</strong></td>
                    <td>₹${row.avg_fuel_price.toFixed(2)}</td>
                    <td><span class="text-orange" style="color: var(--accent-orange); font-weight:600;">+${row.avg_mileage_drop_pct.toFixed(2)}%</span></td>
                    <td>${row.reports_count.toLocaleString()} reports</td>
                `;
                regionalTableBody.appendChild(tr);
            });
            
            // Update counts
            totalReportsVal.textContent = totalReports.toLocaleString();
            
            const nationalAvg = totalReports > 0 ? (sumDrops / totalReports) : 3.25;
            avgNationalDropVal.textContent = `${nationalAvg.toFixed(2)}%`;
            
        } catch (err) {
            console.error("Error loading regional data:", err);
            regionalTableBody.innerHTML = '<tr><td colspan="4" class="text-center">Failed to load database.</td></tr>';
        }
    }

    // Handle Profiler analysis
    profilerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Show spinner
        const spinner = btnAnalyse.querySelector('.spinner');
        const btnText = btnAnalyse.querySelector('.btn-text');
        spinner.classList.remove('hidden');
        btnText.classList.add('hidden');
        btnAnalyse.disabled = true;

        const payload = {
            vehicle_model: selectModel.value,
            vehicle_year: parseInt(document.getElementById('vehicle_year').value),
            engine_cc: parseInt(document.getElementById('engine_cc').value),
            transmission_type: document.getElementById('transmission_type').value,
            odometer_km: parseFloat(document.getElementById('odometer_km').value),
            current_mileage: parseFloat(document.getElementById('current_mileage').value),
            daily_distance_km: parseFloat(document.getElementById('daily_distance_km').value),
            city_driving_percent: parseFloat(cityHighwaySlider.value),
            driving_style: document.getElementById('driving_style').value,
            ac_usage_percent: parseFloat(document.getElementById('ac_usage_percent').value),
            traffic_level: document.getElementById('traffic_level').value,
            region: document.getElementById('region').value,
            fuel_price: parseFloat(document.getElementById('fuel_price').value),
            e20_fuel_price: parseFloat(document.getElementById('e20_fuel_price').value)
        };

        try {
            const res = await fetch('/api/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const results = await res.json();
            
            if (res.status !== 200) {
                alert("Error running prediction: " + results.error);
                return;
            }

            // Update DOM Results
            
            // 1. E20 Performance Score gauge
            const score = results.compatibility_score;
            scoreVal.textContent = score;
            
            // Calculate circular progress color and stroke degree
            let color = 'var(--accent-green)';
            let statusClass = 'excellent';
            if (score < 50) {
                color = 'var(--accent-red)';
                statusClass = 'danger';
            } else if (score < 80) {
                color = 'var(--accent-orange)';
                statusClass = 'warning';
            }
            
            scoreCircle.style.background = `conic-gradient(${color} ${score * 3.6}deg, var(--border-color) 0deg)`;
            scoreStatus.textContent = results.compatibility_status;
            scoreStatus.className = `score-status ${statusClass}`;
            
            // 2. Mileage drop
            dropVal.textContent = results.mileage_drop_percent;
            baseMileageVal.textContent = payload.current_mileage.toFixed(1);
            e20MileageVal.textContent = results.predicted_e20_mileage.toFixed(1);
            
            // 3. Confidence
            confidenceVal.textContent = results.confidence_score;
            
            // 4. Projections & badges
            const savings = results.projections.annual_savings;
            if (savings >= 0) {
                savingsBadge.textContent = `₹${savings.toLocaleString('en-IN')} saved / yr`;
                savingsBadge.className = 'badge green-badge';
            } else {
                savingsBadge.textContent = `+ ₹${Math.abs(savings).toLocaleString('en-IN')} cost / yr`;
                savingsBadge.className = 'badge orange-badge';
            }
            
            co2Badge.textContent = `${results.projections.co2_saved_kg.toLocaleString()} kg CO2 saved`;
            treesVal.textContent = results.projections.trees_equivalent.toFixed(1);
            
            annualCostRegular.textContent = `₹${results.projections.annual_cost_regular.toLocaleString('en-IN')}`;
            annualCostE20.textContent = `₹${results.projections.annual_cost_e20.toLocaleString('en-IN')}`;
            
            // Update financial chart
            initFinancialChart(results.projections.annual_cost_regular, results.projections.annual_cost_e20);
            
            // 5. Checklist
            checklistContainer.innerHTML = '';
            results.checklist.forEach((item, idx) => {
                const checkDiv = document.createElement('div');
                checkDiv.className = `checklist-item ${item.severity}`;
                
                checkDiv.innerHTML = `
                    <div class="chk-bullet">${idx + 1}</div>
                    <div class="chk-content">
                        <h4>${item.title}</h4>
                        <p>${item.desc}</p>
                    </div>
                `;
                checklistContainer.appendChild(checkDiv);
            });
            
        } catch (err) {
            console.error("Error during prediction fetch:", err);
            alert("Connection error to backend Flask server.");
        } finally {
            // Restore button state
            spinner.classList.add('hidden');
            btnText.classList.remove('hidden');
            btnAnalyse.disabled = false;
        }
    });

    // Handle crowdsourcing loop feedback
    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btnText = document.getElementById('btn-submit-feedback').querySelector('.btn-text');
        const spinner = document.getElementById('btn-submit-feedback').querySelector('.spinner');
        
        btnText.classList.add('hidden');
        spinner.classList.remove('hidden');
        document.getElementById('btn-submit-feedback').disabled = true;

        const payload = {
            vehicle_model: selectFbModel.value,
            vehicle_year: parseInt(document.getElementById('fb_vehicle_year').value),
            current_mileage: parseFloat(document.getElementById('fb_current_mileage').value),
            e20_mileage: parseFloat(document.getElementById('fb_e20_mileage').value),
            driving_style: document.getElementById('fb_driving_style').value,
            region: document.getElementById('fb_region').value
        };

        try {
            const res = await fetch('/api/submit_feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const results = await res.json();
            
            if (res.status === 200) {
                alert("Thank you! Crowdsourced telemetry submitted. The Random Forest model has been retrained successfully with your data!");
                feedbackForm.reset();
                // Reload tables
                loadRegionalData();
            } else {
                alert("Error submitting feedback: " + results.error);
            }
            
        } catch (err) {
            console.error("Feedback error:", err);
            alert("Failed to submit feedback to server.");
        } finally {
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
            document.getElementById('btn-submit-feedback').disabled = false;
        }
    });

    // Initial setups
    loadModels();
    loadRegionalData();
    initFinancialChart();
});