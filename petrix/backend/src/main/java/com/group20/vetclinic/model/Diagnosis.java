package com.group20.vetclinic.model;

import lombok.Data;

@Data
public class Diagnosis {
    private int diagnosisId;
    private int visitId;
    private String description;
    private String icdCode;
    private String severity;
    private String treatmentNotes;
    private boolean followUpRequired;
}
