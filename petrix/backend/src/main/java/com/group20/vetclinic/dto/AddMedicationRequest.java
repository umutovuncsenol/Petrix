package com.group20.vetclinic.dto;

public class AddMedicationRequest {
    private String name;
    private String form;
    private String unit;
    private String description;
    private boolean isVaccine;
    private String targetSpecies;
    private Integer frequencyMonths;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getForm() { return form; }
    public void setForm(String form) { this.form = form; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public boolean isVaccine() { return isVaccine; }
    public void setVaccine(boolean vaccine) { isVaccine = vaccine; }

    public String getTargetSpecies() { return targetSpecies; }
    public void setTargetSpecies(String targetSpecies) { this.targetSpecies = targetSpecies; }

    public Integer getFrequencyMonths() { return frequencyMonths; }
    public void setFrequencyMonths(Integer frequencyMonths) { this.frequencyMonths = frequencyMonths; }
}
