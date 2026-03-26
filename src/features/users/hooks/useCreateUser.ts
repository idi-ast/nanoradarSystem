import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersService } from "../services/userService";
import type { CreateUserDto } from "../types/users.types";

export const useCreateUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (userData: CreateUserDto) => usersService.createUser(userData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
    });
};
