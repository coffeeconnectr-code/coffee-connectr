import { ROASTER_BRANDS } from '../lib/roasterConstants'

const emptyMachine = {
  roaster_brand: '',
  custom_brand: '',
  batch_size_kg: '',
}

export default function RoastingEquipmentForm({
  machines,
  totalCapacity,
  contractCapacity,
  onMachinesChange,
  onTotalCapacityChange,
  onContractCapacityChange,
}) {
  function updateMachine(index, field, value) {
    onMachinesChange(
      machines.map((machine, machineIndex) =>
        machineIndex === index ? { ...machine, [field]: value } : machine,
      ),
    )
  }

  function addMachine() {
    onMachinesChange([...machines, { ...emptyMachine }])
  }

  function removeMachine(index) {
    onMachinesChange(machines.filter((_, machineIndex) => machineIndex !== index))
  }

  return (
    <fieldset className="form-section">
      <legend>Roasting equipment</legend>
      <p className="field-hint">
        List each roaster you operate, plus your weekly capacity. Other members can find you by
        roaster type when looking for contract roasting.
      </p>

      {machines.map((machine, index) => {
        const usesCustomBrand = machine.roaster_brand === 'Other'

        return (
          <div key={index} className="machine-card">
            <div className="machine-card-header">
              <strong>Roaster {index + 1}</strong>
              {machines.length > 1 ? (
                <button type="button" className="text-button" onClick={() => removeMachine(index)}>
                  Remove
                </button>
              ) : null}
            </div>

            <label>
              Roaster brand
              <select
                value={machine.roaster_brand}
                onChange={(event) => updateMachine(index, 'roaster_brand', event.target.value)}
              >
                <option value="">Select brand</option>
                {ROASTER_BRANDS.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </label>

            {usesCustomBrand ? (
              <label>
                Custom roaster name
                <input
                  type="text"
                  value={machine.custom_brand}
                  onChange={(event) => updateMachine(index, 'custom_brand', event.target.value)}
                  placeholder="e.g. Custom-built drum roaster"
                />
              </label>
            ) : null}

            <label>
              Batch size (kg)
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={machine.batch_size_kg}
                onChange={(event) => updateMachine(index, 'batch_size_kg', event.target.value)}
                placeholder="e.g. 12"
              />
            </label>
          </div>
        )
      })}

      <button type="button" className="secondary-button" onClick={addMachine}>
        Add another roaster
      </button>

      <label>
        Total roasting capacity (kg / week)
        <input
          type="number"
          min="0"
          step="1"
          value={totalCapacity}
          onChange={(event) => onTotalCapacityChange(event.target.value)}
          placeholder="e.g. 500"
        />
      </label>

      <label>
        Available for contract roasting (kg / week)
        <input
          type="number"
          min="0"
          step="1"
          value={contractCapacity}
          onChange={(event) => onContractCapacityChange(event.target.value)}
          placeholder="e.g. 150"
        />
      </label>
    </fieldset>
  )
}

export function normalizeMachinesForSave(machines) {
  return machines.map((machine) => ({
    roaster_brand:
      machine.roaster_brand === 'Other'
        ? machine.custom_brand?.trim() || 'Other'
        : machine.roaster_brand?.trim(),
    batch_size_kg: machine.batch_size_kg,
  }))
}

export function machinesFromDatabase(rows) {
  if (!rows?.length) {
    return [{ ...emptyMachine }]
  }

  return rows.map((row) => {
    const isKnownBrand = ROASTER_BRANDS.includes(row.roaster_brand)

    return {
      roaster_brand: isKnownBrand ? row.roaster_brand : 'Other',
      custom_brand: isKnownBrand ? '' : row.roaster_brand,
      batch_size_kg: row.batch_size_kg?.toString() ?? '',
    }
  })
}

export { emptyMachine }
