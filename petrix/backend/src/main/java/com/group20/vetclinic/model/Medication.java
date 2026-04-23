package com.group20.vetclinic.model;

import lombok.Data;

@Data
public class Medication {
    private int medId;
    private String name;
    private String form;
    private String unit;
    private String description;
    private boolean isVaccine;
    // Stock info (when joined with STOCKED_AS)
    private Integer quantity;
    private Integer reorderLevel;
    private Boolean lowStockFlagged;
    private String expiryDate;
}
