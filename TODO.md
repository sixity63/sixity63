# TODO: Add Time Range Modes to Monitoring Chart

## Steps to Complete:
- [ ] Change timeRange state to mode with values "minutes", "hours", "days"
- [ ] Update Select components for both charts to use new mode options
- [ ] Modify fetchSensorData to fetch data based on mode (60 min, 24 hours, 7 days)
- [ ] Update chartData mapping to group data by intervals (5 min, hourly, daily)
- [ ] Adjust time labels for each mode (minutes: HH:MM, hours: HH:00, days: day name)
- [ ] Test the implementation to ensure data displays correctly for each mode
