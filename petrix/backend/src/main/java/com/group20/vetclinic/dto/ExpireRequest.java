package com.group20.vetclinic.dto;

public class ExpireRequest {
    private int branchId;
    private int medId;
    private int quantityToRemove;
    private String reason;

    public int getBranchId() {
        return branchId;
    }

    public void setBranchId(int branchId) {
        this.branchId = branchId;
    }

    public int getMedId() {
        return medId;
    }

    public void setMedId(int medId) {
        this.medId = medId;
    }

    public int getQuantityToRemove() {
        return quantityToRemove;
    }

    public void setQuantityToRemove(int quantityToRemove) {
        this.quantityToRemove = quantityToRemove;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
