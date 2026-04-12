package com.group20.vetclinic.model;

import lombok.Data;

@Data
public class Owner {
    private int ownerId;
    private String fullName;
    private String username;
    private String email;
    private String phone;
}
